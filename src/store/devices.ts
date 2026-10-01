import type { Device } from 'react-native-ble-plx';
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
};

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
  lastOrderAt: number;
  /** Set when an id is added or removed, so membership bypasses the cooldown. */
  membershipDirty: boolean;

  merge: (pending: Map<string, Device>) => void;
  sweepStale: () => void;
  recomputeOrder: (force?: boolean) => void;
  setFrozen: (frozen: boolean) => void;
  setSortKey: (key: SortKey) => void;
  setFilters: (patch: Partial<Filters>) => void;
  reset: () => void;
};

function createRecord(device: Device, rssi: number, now: number): DeviceRecord {
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

    pending.forEach((device, id) => {
      const previous = devices[id];
      const rssi = device.rssi ?? previous?.rssi ?? -127;
      if (previous) {
        devices[id] = {
          ...previous,
          rssi,
          smoothed: ema(previous.smoothed, rssi),
          lastSeen: now,
          staleness: 'live',
        };
      } else {
        devices[id] = createRecord(device, rssi, now);
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
