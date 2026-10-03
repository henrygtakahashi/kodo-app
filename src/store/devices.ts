import type { Device } from 'react-native-ble-plx';

/**
 * A device plus the arrival time of every raw callback since the last flush.
 * Times are captured in the scan callback, not at flush: the cadence display
 * draws one tick per advertisement, so 125 ms-quantised times would turn every
 * device into the same rhythm.
 */
export type PendingDevice = { device: Device; times: number[] };
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

/**
 * History is sampled on a fixed clock, not per packet. The x-axis is time, so
 * the points must be evenly spaced — sampling on arrival would make the axis a
 * function of how chattily each device advertises.
 */
export const HISTORY_HZ = 4;
export const HISTORY_SECONDS = 20;
export const HISTORY_LENGTH = HISTORY_HZ * HISTORY_SECONDS;

/** How much of the recent past the cadence strip shows. */
export const CADENCE_WINDOW_MS = 10_000;

/**
 * Ticks closer together than this are not kept. The strip is about 190 px wide
 * for 10 s, so one pixel is roughly 50 ms: anything denser draws on top of
 * itself and renders as the same solid block. A 5 ms advertiser would
 * otherwise put 2000 segments in one strip, rebuilt and stroked on every store
 * write. The rate itself is not lost: `packets` still counts every
 * advertisement, and the mean interval is computed from it.
 */
export const MIN_TICK_GAP_MS = 40;

export type Staleness = 'live' | 'stale';

/**
 * What a device has broadcast, accumulated across packets.
 *
 * Devices alternate payloads: a Galaxy Watch8 interleaves a manufacturer-data
 * packet with a service-data one, every other advertisement. Keeping only the
 * latest made the detail screen strobe between the two at the flush rate, and
 * showed fields as absent that the device does broadcast. An advertisement is
 * the union of what a device sends, not whichever packet arrived last.
 */
export type Advertisement = {
  name: string | null;
  localName: string | null;
  manufacturerData: string | null;
  serviceUUIDs: string[] | null;
  serviceData: Record<string, string> | null;
  solicitedServiceUUIDs: string[] | null;
  overflowServiceUUIDs: string[] | null;
  /** Distinct raw records seen, in first-seen order. Capped. */
  rawRecords: string[];
};

const MAX_RAW_RECORDS = 4;

function union(previous: string[] | null, next: string[] | null): string[] | null {
  if (!next?.length) return previous;
  if (!previous?.length) return next;
  const merged = new Set([...previous, ...next]);
  // Keep the old array when nothing was added, so selectors do not see a change.
  return merged.size === previous.length ? previous : [...merged];
}

/** Non-null wins; a packet that omits a field must not erase it. */
function mergeAdvertisement(previous: Advertisement, device: Device): Advertisement {
  const record = device.rawScanRecord;
  const rawRecords =
    record && !previous.rawRecords.includes(record)
      ? [...previous.rawRecords, record].slice(-MAX_RAW_RECORDS)
      : previous.rawRecords;

  const serviceUUIDs = union(previous.serviceUUIDs, device.serviceUUIDs);
  const solicited = union(previous.solicitedServiceUUIDs, device.solicitedServiceUUIDs);
  const overflow = union(previous.overflowServiceUUIDs, device.overflowServiceUUIDs);
  const serviceData = device.serviceData
    ? { ...(previous.serviceData ?? {}), ...device.serviceData }
    : previous.serviceData;

  const next: Advertisement = {
    name: device.name ?? previous.name,
    localName: device.localName ?? previous.localName,
    manufacturerData: device.manufacturerData ?? previous.manufacturerData,
    serviceUUIDs,
    serviceData,
    solicitedServiceUUIDs: solicited,
    overflowServiceUUIDs: overflow,
    rawRecords,
  };

  // Return the previous object when nothing was added. Without this the merge
  // allocates on every flush and every advertisement selector fires at 8 Hz,
  // which is the churn this whole change exists to remove.
  const unchanged =
    next.name === previous.name &&
    next.localName === previous.localName &&
    next.manufacturerData === previous.manufacturerData &&
    next.serviceUUIDs === previous.serviceUUIDs &&
    next.serviceData === previous.serviceData &&
    next.solicitedServiceUUIDs === previous.solicitedServiceUUIDs &&
    next.overflowServiceUUIDs === previous.overflowServiceUUIDs &&
    next.rawRecords === previous.rawRecords;

  return unchanged ? previous : next;
}

export type DeviceRecord = {
  id: string;
  /** Derived on first sight; upgraded only while vendor, kind or name is missing. */
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
  /** Smoothed RSSI sampled at HISTORY_HZ, oldest first. */
  history: number[];
  /** Arrival timestamps within CADENCE_WINDOW_MS, oldest first. */
  arrivals: number[];
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
  /** The device Hunt is tracking. Survives tab switches; cleared on reset. */
  targetId: string | null;
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
  sampleHistory: () => void;
  recomputeOrder: (force?: boolean) => void;
  setFrozen: (frozen: boolean) => void;
  setScanning: (scanning: boolean) => void;
  setTarget: (id: string | null) => void;
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
    serviceUUIDs: device.serviceUUIDs,
    serviceData: device.serviceData,
    solicitedServiceUUIDs: device.solicitedServiceUUIDs,
    overflowServiceUUIDs: device.overflowServiceUUIDs,
    rawRecords: device.rawScanRecord ? [device.rawScanRecord] : [],
  };
}

/**
 * Window-pruned, density-capped arrival list. Returns `previous` itself when
 * nothing changed, so strips can skip copying it to the UI thread.
 */
function nextArrivals(previous: number[], incoming: number[], cutoff: number): number[] {
  let start = 0;
  while (start < previous.length && previous[start] < cutoff) start += 1;

  let last = start < previous.length ? previous[previous.length - 1] : -Infinity;
  let added: number[] | null = null;
  for (const t of incoming) {
    if (t - last >= MIN_TICK_GAP_MS) {
      (added ??= []).push(t);
      last = t;
    }
  }

  if (start === 0 && added === null) return previous;
  const kept = start === 0 ? previous : previous.slice(start);
  return added === null ? kept : kept.concat(added);
}

function createRecord(device: Device, rssi: number, now: number, times: number[]): DeviceRecord {
  const advertisement = advertisementOf(device);
  const identity = deriveIdentity(device.id, advertisement);
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
    history: [rssi],
    arrivals: nextArrivals([], times, 0),
    advertisement,
    packets: times.length,
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
  targetId: null,
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

    const cutoff = now - CADENCE_WINDOW_MS;

    pending.forEach(({ device, times }, id) => {
      const previous = devices[id];
      const rssi = device.rssi ?? previous?.rssi ?? -127;
      if (previous) {
        // A new object only when something was actually added, so selectors on
        // the advertisement do not fire 8 Hz for an unchanged payload.
        const advertisement = mergeAdvertisement(previous.advertisement, device);
        const changed = advertisement !== previous.advertisement;

        // A device does not put everything in every packet: the first one seen
        // may carry a name and no manufacturer data, or the reverse. Identity
        // is still derived once, but an incomplete one is upgraded when a
        // richer packet arrives — bounded to payload changes, and only while
        // something is still missing.
        // Derived from the merged advertisement, not this packet alone, so a
        // packet that omits a field cannot erase what an earlier one supplied.
        const incomplete =
          previous.identity.vendor === null ||
          previous.identity.kind === null ||
          !previous.hasRealName;
        const identity =
          changed && incomplete ? deriveIdentity(id, advertisement) : previous.identity;

        devices[id] = {
          ...previous,
          rssi,
          smoothed: ema(previous.smoothed, rssi),
          lastSeen: now,
          staleness: 'live',
          packets: previous.packets + times.length,
          // Pruned to the window here rather than at draw time, so the buffer
          // cannot grow without bound for a chatty device.
          arrivals: nextArrivals(previous.arrivals, times, cutoff),
          identity,
          hasRealName:
            previous.hasRealName || Boolean(device.name?.trim() || device.localName?.trim()),
          advertisement,
        };
      } else {
        devices[id] = createRecord(device, rssi, now, times);
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

  /**
   * Appends one point per device per tick, including devices that went quiet —
   * a flat trace is information, and a gap would misread as "no data" rather
   * than "no change".
   */
  sampleHistory: () => {
    const current = get().devices;
    const ids = Object.keys(current);
    if (ids.length === 0) return;

    const devices: Record<string, DeviceRecord> = {};
    for (const id of ids) {
      const record = current[id];
      const history = [...record.history, record.smoothed];
      devices[id] = {
        ...record,
        history: history.length > HISTORY_LENGTH ? history.slice(-HISTORY_LENGTH) : history,
      };
    }
    set({ devices });
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
  setTarget: (targetId) => set({ targetId }),

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

  reset: () =>
    set({ devices: {}, order: [], lastOrderAt: 0, membershipDirty: false, targetId: null }),
}));

export function bandOf(record: Pick<DeviceRecord, 'smoothed'>): Band {
  return bandFor(record.smoothed);
}
