import { useEffect, useRef, useState } from 'react';
import { ScanMode, type Device } from 'react-native-ble-plx';

import { useDeviceStore } from '@/store/devices';
import { getBleManager } from './manager';

/** 8 Hz. Drains arrivals. */
const FLUSH_MS = 125;
/** 1 Hz. Ages out absences — a separate job, so a separate clock. */
const SWEEP_MS = 1_000;

/**
 * Owns the scan lifecycle and the two timers from ARCHITECTURE.md §3.
 *
 * The scan callback does no React work and no store work: it writes into a
 * plain Map. At 5–20 Hz per device a busy room is 100–300 callbacks/sec, and
 * nothing at that rate may reach React.
 */
export function useScan(enabled: boolean) {
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(new Map<string, Device>());

  useEffect(() => {
    if (!enabled) return;

    const manager = getBleManager();
    const store = useDeviceStore.getState();
    setError(null);

    // allowDuplicates is iOS-only and does nothing here. On Android the
    // equivalent is LowLatency scan mode, which reports every advertisement
    // instead of coalescing in the system scanner.
    manager.startDeviceScan(null, { scanMode: ScanMode.LowLatency }, (scanError, device) => {
      if (scanError) {
        setError(scanError.message);
        return;
      }
      if (device) pending.current.set(device.id, device);
    });

    const flush = setInterval(() => {
      if (pending.current.size === 0) return;
      useDeviceStore.getState().merge(pending.current);
      pending.current.clear();
    }, FLUSH_MS);

    // Expiry needs 1 Hz resolution; reordering does not, and at 1 Hz it makes
    // the list churn. recomputeOrder enforces its own cooldown and only
    // bypasses it when membership changed (ORDER_COOLDOWN_MS in the store).
    const sweep = setInterval(() => {
      const state = useDeviceStore.getState();
      state.sweepStale();
      state.recomputeOrder();
    }, SWEEP_MS);

    return () => {
      clearInterval(flush);
      clearInterval(sweep);
      manager.stopDeviceScan();
      pending.current.clear();
      store.reset();
    };
  }, [enabled]);

  return { error };
}
