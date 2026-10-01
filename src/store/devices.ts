import type { Device } from 'react-native-ble-plx';
import { create } from 'zustand';

import { deriveIdentity, type Identity } from '@/ble/identity';
import { hueFor } from '@/ble/hash';
import { bandFor, ema, type Band } from '@/ble/signal';

/** Two-stage expiry (BRIEF.md §0). Advertising intervals reach 10.24 s by spec,
 *  so one threshold cannot both avoid flicker and avoid ghosts. */
export const STALE_AFTER_MS = 3_000;
export const EXPIRE_AFTER_MS = 10_000;

export type Staleness = 'live' | 'stale';

export type DeviceRecord = {
  id: string;
  /** Static: derived once on first sight, never recomputed. */
  identity: Identity;
  hue: number;
  isConnectable: boolean | null;
  txPowerLevel: number | null;
  firstSeen: number;
  /** Dynamic. */
  rssi: number;
  smoothed: number;
  lastSeen: number;
  staleness: Staleness;
};

export type SortKey = 'signal' | 'name' | 'first-seen' | 'last-seen';

type DevicesState = {
  devices: Record<string, DeviceRecord>;
  order: string[];
  sortKey: SortKey;
  /** True while a finger is on the list; order recompute pauses. */
  frozen: boolean;
  merge: (pending: Map<string, Device>) => void;
  sweepStale: () => void;
  recomputeOrder: () => void;
  setFrozen: (frozen: boolean) => void;
  setSortKey: (key: SortKey) => void;
  reset: () => void;
};

function createRecord(device: Device, rssi: number, now: number): DeviceRecord {
  return {
    id: device.id,
    identity: deriveIdentity(device),
    hue: hueFor(device.id),
    isConnectable: device.isConnectable,
    txPowerLevel: device.txPowerLevel,
    firstSeen: now,
    rssi,
    smoothed: rssi,
    lastSeen: now,
    staleness: 'live',
  };
}

export const useDeviceStore = create<DevicesState>((set, get) => ({
  devices: {},
  order: [],
  sortKey: 'signal',
  frozen: false,

  /**
   * One write per flush for the whole batch, never one per advertisement.
   * Rows select primitives, so a new `devices` object here does not re-render
   * rows whose own values did not change.
   */
  merge: (pending) => {
    if (pending.size === 0) return;
    const now = Date.now();
    const devices = { ...get().devices };

    pending.forEach((device, id) => {
      const previous = devices[id];
      const rssi = device.rssi ?? previous?.rssi ?? -127;
      devices[id] = previous
        ? {
            ...previous,
            rssi,
            smoothed: ema(previous.smoothed, rssi),
            lastSeen: now,
            staleness: 'live',
          }
        : createRecord(device, rssi, now);
    });

    set({ devices });
  },

  /**
   * Runs on its own clock. A device that stops advertising produces no packets,
   * so the packet-driven flush can never notice it leaving.
   */
  sweepStale: () => {
    const now = Date.now();
    const current = get().devices;
    let changed = false;
    const devices: Record<string, DeviceRecord> = {};

    for (const id in current) {
      const record = current[id];
      const age = now - record.lastSeen;

      if (age > EXPIRE_AFTER_MS) {
        changed = true; // dropped entirely
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
    if (changed) set({ devices });
  },

  /**
   * Order is a ~1 Hz snapshot, not a per-tick derivation. A signal-sorted list
   * that reorders 8x/sec moves rows out from under the user's finger
   * (DESIGN.md §2).
   */
  recomputeOrder: () => {
    const { devices, sortKey, frozen, order } = get();
    if (frozen) return;

    const ids = Object.keys(devices);
    ids.sort((a, b) => {
      const x = devices[a];
      const y = devices[b];
      switch (sortKey) {
        case 'name':
          return x.identity.label.localeCompare(y.identity.label);
        case 'first-seen':
          return x.firstSeen - y.firstSeen;
        case 'last-seen':
          return y.lastSeen - x.lastSeen;
        default:
          return y.smoothed - x.smoothed; // strongest first
      }
    });

    // Keep the old array identity when nothing moved, so the list does not
    // re-render once a second for an identical order.
    if (ids.length === order.length && ids.every((id, i) => id === order[i])) return;
    set({ order: ids });
  },

  setFrozen: (frozen) => set({ frozen }),
  setSortKey: (sortKey) => {
    set({ sortKey });
    get().recomputeOrder();
  },
  reset: () => set({ devices: {}, order: [] }),
}));

export function bandOf(record: Pick<DeviceRecord, 'smoothed'>): Band {
  return bandFor(record.smoothed);
}
