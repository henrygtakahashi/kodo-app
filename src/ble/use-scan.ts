import { useCallback, useEffect, useRef, useState } from 'react';
import { ScanMode } from 'react-native-ble-plx';

import { useDeviceStore, type PendingDevice } from '@/store/devices';
import { getBleManager } from './manager';

/** 8 Hz. Drains arrivals. */
const FLUSH_MS = 125;
/** 1 Hz. Ages out absences — a separate job, so a separate clock. */
const SWEEP_MS = 1_000;
/** 4 Hz. Samples history on a fixed clock so the trace's x-axis is real time. */
const HISTORY_MS = 250;
/**
 * Android blocks an app that starts LE scans too often (5 starts in 30 s), and
 * a failed start never recovers on its own — the callback fires once and that
 * is the end of it. Retry past the window rather than leaving the app dead.
 */
const RETRY_MS = 30_000;

/**
 * Owns the scan lifecycle and the two timers from ARCHITECTURE.md §3.
 *
 * The scan callback does no React work and no store work: it writes into a
 * plain Map. At 5–20 Hz per device a busy room is 100–300 callbacks/sec, and
 * nothing at that rate may reach React.
 */
export function useScan(enabled: boolean) {
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(new Map<string, PendingDevice>());
  // ScanSettings are fixed when the scan starts, so changing this has to tear
  // the scan down and start a new one — hence a dependency, not a read.
  const legacyOnly = useDeviceStore((state) => state.legacyOnly);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const manager = getBleManager();
    setError(null);
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // allowDuplicates is iOS-only and does nothing here. On Android the
    // equivalent is LowLatency scan mode, which reports every advertisement
    // instead of coalescing in the system scanner.
    //
    // legacyScan maps to ScanSettings.setLegacy(). Its default, true, restricts
    // results to Bluetooth 4.2-style legacy advertisements, so BLE 5 extended
    // advertisers are invisible. Android documents the flag as "whether ONLY
    // legacy advertisements should be returned", which reads either as "both"
    // or as "extended only" — measured on device: with false, every legacy
    // advertiser was still reported, so it means both.
    manager.startDeviceScan(
      null,
      { scanMode: ScanMode.LowLatency, legacyScan: legacyOnly },
      (scanError, device) => {
        if (scanError) {
          setError(scanError.message);
          // One pending retry at a time; the callback can fire repeatedly.
          if (!retryTimer) retryTimer = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
          return;
        }
        if (!device) return;
        // Count every callback here, before coalescing: the flush runs at
        // 8 Hz, so counting there would quantise the advertising interval to
        // 125 ms and make it meaningless.
        const seen = pending.current.get(device.id);
        const times = seen?.times ?? [];
        times.push(Date.now());
        pending.current.set(device.id, { device, times });
      }
    );

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

    const history = setInterval(() => useDeviceStore.getState().sampleHistory(), HISTORY_MS);

    return () => {
      clearTimeout(retryTimer);
      clearInterval(flush);
      clearInterval(sweep);
      clearInterval(history);
      manager.stopDeviceScan();
      pending.current.clear();
      // Deliberately no reset: pausing must keep the list readable. Entries
      // that really did go away expire on their own once the sweep resumes.
    };
  }, [enabled, legacyOnly, attempt]);

  return { error, retry };
}
