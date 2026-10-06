import { useCallback, useEffect, useRef, useState } from 'react';
import { ScanMode } from 'react-native-ble-plx';

import { useDeviceStore, type PendingDevice } from '@/store/devices';
import { getBleManager } from './manager';
import { friendlyScanError } from './scan-errors';

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
 * Android demotes an unfiltered scan to "opportunistic" after a timeout, and
 * from then on the app only hears devices when some other app is scanning: the
 * list empties within seconds. AOSP's timeout is 30 min; on the Samsung test
 * phone (SDK 36) logcat showed exactly 5 min:
 *   ScanManager: Moving unfiltered scan to opportunistic scan for ScanClient(…)
 * A filter would exempt the scan, but a scanner must see everything, so the scan
 * is restarted before the timeout instead. Each restart is a fresh scan client
 * with a fresh timer. 3 min, not 4: JS timers drift on device (one 4 min
 * restart landed at 4 min 20 s), and the margin has to survive that. One start
 * every 3 min is far under Android's limit of 5 starts per 30 s.
 */
const RESCAN_MS = 3 * 60_000;

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
    const start = () => manager.startDeviceScan(
      null,
      { scanMode: ScanMode.LowLatency, legacyScan: legacyOnly },
      (scanError, device) => {
        if (scanError) {
          console.warn('[scan]', scanError.errorCode, scanError.message);
          setError(friendlyScanError(scanError));
          // One pending retry at a time; the callback can fire repeatedly.
          if (!retryTimer) retryTimer = setTimeout(() => setAttempt((n) => n + 1), RETRY_MS);
          return;
        }
        if (!device) return;
        // Count every callback here, before coalescing: the flush runs at
        // 8 Hz, so counting there would quantise the advertising interval to
        // 125 ms and make it meaningless.
        const seen = pending.current.get(device.id);
        const now = Date.now();
        const times = seen?.times ?? [];
        const samples = seen?.samples ?? [];
        times.push(now);
        // Each packet's RSSI is kept: the device object only holds the last.
        if (device.rssi !== null) samples.push({ t: now, rssi: device.rssi });
        pending.current.set(device.id, { device, times, samples });
      }
    );

    const begin = () =>
      start().catch((e: unknown) => {
        console.warn('[scan] start failed', e);
        setError(friendlyScanError(e));
      });
    begin();

    // The gap between stop and start is a few milliseconds; nothing is lost
    // from the list, which expires on its own clock. Start only after the stop
    // has landed: ble-plx overwrites its scan handle on start without disposing
    // the old one, so a start that overtook the stop would leak a scanner.
    const rescan = setInterval(() => {
      void manager
        .stopDeviceScan()
        .catch(() => undefined)
        .then(begin);
    }, RESCAN_MS);

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
      clearInterval(rescan);
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
