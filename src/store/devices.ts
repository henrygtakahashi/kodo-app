import type { Device } from 'react-native-ble-plx';

/** A device plus how many raw callbacks it produced since the last flush. */
export type PendingDevice = { device: Device; count: number };
import { create } from 'zustand';

import { hueFor } from '@/ble/hash';
import { deriveIdentity, type Identity } from '@/ble/identity';
import { bandFor, ema, type Band } from '@/ble/signal';

/** Two-stage expiry (BRIEF.md §0). Advertising intervals reach 10.24 s by spec,
 *  so one threshold cannot both avoid flicker and avoid ghosts. */
export const STALE_AFTER_MS = 3_000;
export const EXPIRE_AFTER_MS = 10_000;

/**
 * Reordering cooldown. The sweep runs at 1 Hz because expiry needs that
 * resolution, but re-sorting at 1 Hz makes the list visibly churn. Membership
 * changes still land within one sweep — only reordering waits.
 */
export const ORDER_COOLDOWN_MS = 3_000;

/**
 * Signal is bucketed to 4 dBm before sorting. Raw RSSI noise is +/-10 dBm, so
 * two devices of similar strength would otherwise swap places on every single
 * recompute.
 *
 * Bucketing rather than a "ignore small differences" comparator on purpose: the
 * latter is intransitive (a~b, b~c, but a<c) and Array.sort gives undefined
 * results for an inconsistent comparator. Bucket-then-tiebreak is transitive.
 */
export const SIGNAL_BUCKET_DB = 4;

export type Staleness = 'live' | 'stale';

/** The advertisement as received, kept verbatim for the detail screen. */
export type Advertisement = {
  name: string | null;
  localName: string | null;
  manufacturerData: string | null;
  rawScanRecord: string;
  serviceUUIDs: string[] | null;
  serviceData: Record<string, string> | null;
  solicitedServiceUUIDs: string[] | null;
  overflowServiceUUIDs: string[] | null;
};

export type DeviceRecord = {
  id: string;
  /** Static: derived once on first sight, never recomputed. */
  identity: Identity;
  hue: number;
  isConnectable: boolean | null;
  txPowerLevel: number | null;
  firstSeen: number;
  hasRealName: boolean;
  /** Dynamic. */
  rssi: number;
  smoothed: number;
  lastSeen: number;
  staleness: Staleness;
  advertisement: Advertisement;
  /**
   * Every scan callback for this device, counted before coalescing. The flush
   * runs at 8 Hz, so counting at flush time would quantise the advertising
   * interval to 125 ms and make it meaningless.
   */
  packets: number;
};

/** Mean advertising interval in ms, or null until there are two packets. */
export function advertisingIntervalMs(record: DeviceRecord): number | null {
  if (record.packets < 2) return null;
  const span = record.lastSeen - record.firstSeen;
  if (span <= 0) return null;
  return Math.round(span / (record.packets - 1));
}

export type SortKey = 'signal' | 'name' | 'first-seen' | 'last-seen';

export type Filters = {
  query: string;
  /** null means no floor. */
  minRssi: number | null;
  namedOnly: boolean;
};

type DevicesState = {
  devices: Record<string, DeviceRecord>;
  order: string[];
  sortKey: SortKey;
  filters: Filters;
  frozen: boolean;
  /** User intent, not gate state. Scanning only runs when both allow it. */
  scanning: boolean;
  /**
   * Scan setting, not a filter: it changes what the radio captures, not what
   * the list shows. Restricts results to Bluetooth 4.x legacy advertisements,
   * hiding BLE 5 extended advertisers entirely. Off by default — a scanner
   * should see everything unless told otherwise.
   */
  legacyOnly: boolean;
  lastOrderAt: number;
  /** Set when an id is added or removed, so membership bypasses the cooldown. */
  membershipDirty: boolean;

  merge: (pending: Map<string, PendingDevice>) => void;
  sweepStale: () => void;
  recomputeOrder: (force?: boolean) => void;
  setFrozen: (frozen: boolean) => void;
  setScanning: (scanning: boolean) => void;
  setLegacyOnly: (legacyOnly: boolean) => void;
  setSortKey: (key: SortKey) => void;
  setFilters: (patch: Partial<Filters>) => void;
  reset: () => void;
};

function advertisementOf(device: Device): Advertisement {
  return {
    name: device.name,
    localName: device.localName,
    manufacturerData: device.manufacturerData,
    rawScanRecord: device.rawScanRecord,
    serviceUUIDs: device.serviceUUIDs,
    serviceData: device.serviceData,
    solicitedServiceUUIDs: device.solicitedServiceUUIDs,
    overflowServiceUUIDs: device.overflowServiceUUIDs,
  };
}

function createRecord(device: Device, rssi: number, now: number, packets: number): DeviceRecord {
  const identity = deriveIdentity(device);
  return {
    id: device.id,
    identity,
    hue: hueFor(device.id),
    isConnectable: device.isConnectable,
    txPowerLevel: device.txPowerLevel,
    firstSeen: now,
    hasRealName: Boolean(device.name?.trim() || device.localName?.trim()),
    rssi,
    smoothed: rssi,
    lastSeen: now,
    staleness: 'live',
    advertisement: advertisementOf(device),
    packets,
  };
}

function matches(record: DeviceRecord, filters: Filters): boolean {
  if (filters.namedOnly && !record.hasRealName) return false;
  if (filters.minRssi !== null && record.smoothed < filters.minRssi) return false;

  const query = filters.query.trim().toLowerCase();
  if (!query) return true;
  return (
    record.identity.label.toLowerCase().includes(query) ||
    record.id.toLowerCase().includes(query)
  );
}

/** Quantized sort key. Equal buckets fall through to the previous position. */
function bucketOf(record: DeviceRecord, sortKey: SortKey): number {
  switch (sortKey) {
    case 'first-seen':
      return record.firstSeen;
    case 'last-seen':
      return -Math.floor(record.lastSeen / 1000); // whole seconds, newest first
    case 'name':
      return 0; // name has its own comparator; no quantization needed
    default:
      return -Math.round(record.smoothed / SIGNAL_BUCKET_DB); // strongest first
  }
}

export const useDeviceStore = create<DevicesState>((set, get) => ({
  devices: {},
  order: [],
  sortKey: 'signal',
  filters: { query: '', minRssi: null, namedOnly: false },
  frozen: false,
  scanning: true,
  legacyOnly: false,
  lastOrderAt: 0,
  membershipDirty: false,

  /**
   * One write per flush for the whole batch, never one per advertisement.
   * Rows select primitives, so a new `devices` object here does not re-render
   * rows whose own values did not change.
   */
  merge: (pending) => {
    if (pending.size === 0) return;
    const now = Date.now();
    const devices = { ...get().devices };
    let added = false;

    pending.forEach(({ device, count }, id) => {
      const previous = devices[id];
      const rssi = device.rssi ?? previous?.rssi ?? -127;
      if (previous) {
        // Replaced only when the payload actually changed. Rebuilding this
        // object every flush would churn 8 Hz x N objects for nothing.
        const changed = previous.advertisement.rawScanRecord !== device.rawScanRecord;

        // A device does not put everything in every packet: the first one seen
        // may carry a name and no manufacturer data, or the reverse. Identity
        // is still derived once, but an incomplete one is upgraded when a
        // richer packet arrives — bounded to payload changes, and only while
        // something is still missing.
        const incomplete = previous.identity.vendor === null || !previous.hasRealName;
        const identity = changed && incomplete ? deriveIdentity(device) : previous.identity;

        devices[id] = {
          ...previous,
          rssi,
          smoothed: ema(previous.smoothed, rssi),
          lastSeen: now,
          staleness: 'live',
          packets: previous.packets + count,
          identity,
          hasRealName:
            previous.hasRealName || Boolean(device.name?.trim() || device.localName?.trim()),
          advertisement: changed ? advertisementOf(device) : previous.advertisement,
        };
      } else {
        devices[id] = createRecord(device, rssi, now, count);
        added = true;
      }
    });

    set(added ? { devices, membershipDirty: true } : { devices });
  },

  /**
   * Runs on its own clock. A device that stops advertising produces no packets,
   * so the packet-driven flush can never notice it leaving.
   */
  sweepStale: () => {
    const now = Date.now();
    const current = get().devices;
    let changed = false;
    let removed = false;
    const devices: Record<string, DeviceRecord> = {};

    for (const id in current) {
      const record = current[id];
      const age = now - record.lastSeen;

      if (age > EXPIRE_AFTER_MS) {
        changed = true;
        removed = true;
        continue;
      }

      const staleness: Staleness = age > STALE_AFTER_MS ? 'stale' : 'live';
      if (staleness !== record.staleness) {
        devices[id] = { ...record, staleness };
        changed = true;
      } else {
        devices[id] = record;
      }
    }

    // Writing unconditionally would re-render every subscriber once a second
    // for nothing.
    if (changed) set(removed ? { devices, membershipDirty: true } : { devices });
  },

  recomputeOrder: (force = false) => {
    const { devices, sortKey, filters, frozen, order, lastOrderAt, membershipDirty } = get();

    // A finger on the list outranks everything: rows must not move under it.
    if (frozen && !force) return;

    const now = Date.now();
    const due = force || membershipDirty || now - lastOrderAt >= ORDER_COOLDOWN_MS;
    if (!due) return;

    const previousIndex = new Map(order.map((id, index) => [id, index]));
    const ids = Object.keys(devices).filter((id) => matches(devices[id], filters));

    ids.sort((a, b) => {
      const x = devices[a];
      const y = devices[b];

      if (sortKey === 'name') {
        const byName = x.identity.label.localeCompare(y.identity.label);
        if (byName !== 0) return byName;
      } else {
        const byBucket = bucketOf(x, sortKey) - bucketOf(y, sortKey);
        if (byBucket !== 0) return byBucket;
      }

      // Same bucket: hold the position the row already had, so equal-strength
      // devices stop trading places. Unknown ids sort after known ones.
      const ia = previousIndex.get(a) ?? Number.MAX_SAFE_INTEGER;
      const ib = previousIndex.get(b) ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return a.localeCompare(b); // fully deterministic
    });

    const unchanged = ids.length === order.length && ids.every((id, i) => id === order[i]);
    if (unchanged) {
      // Still clear the flags, or membershipDirty would force a recompute
      // every sweep forever.
      if (membershipDirty) set({ membershipDirty: false, lastOrderAt: now });
      return;
    }

    set({ order: ids, lastOrderAt: now, membershipDirty: false });
  },

  setFrozen: (frozen) => set({ frozen }),

  /**
   * Pausing keeps the list exactly as it stands. The sweep stops with the scan,
   * so nothing expires while paused — otherwise every device would vanish ten
   * seconds after the user pressed pause, which is the opposite of a snapshot.
   */
  setScanning: (scanning) => set({ scanning }),

  /**
   * Clears the list, unlike a filter. The captured set is about to change, so
   * keeping devices found under the old settings would show results the current
   * scan could not produce.
   */
  setLegacyOnly: (legacyOnly) => {
    set({ legacyOnly });
    get().reset();
  },

  // Explicit user actions bypass the cooldown — a control that takes 3 s to
  // respond reads as broken.
  setSortKey: (sortKey) => {
    set({ sortKey });
    get().recomputeOrder(true);
  },
  setFilters: (patch) => {
    set({ filters: { ...get().filters, ...patch } });
    get().recomputeOrder(true);
  },

  reset: () => set({ devices: {}, order: [], lastOrderAt: 0, membershipDirty: false }),
}));

export function bandOf(record: Pick<DeviceRecord, 'smoothed'>): Band {
  return bandFor(record.smoothed);
}
