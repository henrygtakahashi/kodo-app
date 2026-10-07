import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { kvStorage } from '@/storage/kv';

/** A device's RSSI at 1 m, measured by the user holding the phone 1 m away. */
export type Calibration1m = {
  /** The address the device had when calibrated. Also the key. */
  id: string;
  /** Broadcast name, if it sent one. The fallback match for rotating addresses. */
  name: string | null;
  rssiAt1m: number;
  savedAt: number;
};

/** What a match needs to know about a device, so this file stays free of the device store. */
export type CalibrationCandidate = { id: string; name: string | null };

type CalibrationsState = {
  calibrations: Record<string, Calibration1m>;
  save: (calibration: Omit<Calibration1m, 'savedAt'>) => void;
  remove: (id: string) => void;
};

export const useCalibrationsStore = create<CalibrationsState>()(
  persist(
    (set, get) => ({
      calibrations: {},
      save: (calibration) => {
        // One calibration per device: a new one under a rotated address replaces
        // the old one found by name.
        const rest = { ...get().calibrations };
        if (calibration.name) {
          for (const id in rest) if (rest[id].name === calibration.name) delete rest[id];
        }
        set({
          calibrations: { ...rest, [calibration.id]: { ...calibration, savedAt: Date.now() } },
        });
      },
      remove: (id) => {
        const { [id]: _removed, ...rest } = get().calibrations;
        set({ calibrations: rest });
      },
    }),
    { name: 'calibrations', storage: kvStorage }
  )
);

/**
 * Same matching as favorites: address first, because it is exact; then the
 * exact broadcast name, which survives an address rotation. Unnamed devices
 * with a rotating address cannot be recognised again.
 */
export function findCalibration(
  calibrations: Record<string, Calibration1m>,
  device: CalibrationCandidate
): Calibration1m | null {
  const direct = calibrations[device.id];
  if (direct) return direct;
  if (!device.name) return null;
  for (const id in calibrations) {
    if (calibrations[id].name === device.name) return calibrations[id];
  }
  return null;
}
