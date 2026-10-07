import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BleErrorCode, State, type Subscription } from 'react-native-ble-plx';

import { getBleManager } from './manager';
import { requestBlePermissions } from './permissions';

export type GateStatus =
  | 'checking'
  | 'ready'
  | 'permission-denied'
  | 'permission-blocked'
  | 'bluetooth-off'
  | 'location-off'
  | 'unauthorized'
  | 'unsupported'
  | 'transient';

export type Gate = {
  status: GateStatus;
  /** Underlying adapter state, for the `transient` case. */
  adapterState?: State;
  retry: () => void;
};

/**
 * The gate chain from BRIEF.md §0. Nothing scans until it reports `ready`, and
 * every failure is recoverable except `unsupported`.
 *
 * Order matters: permissions, then adapter state, then location services. A
 * location probe before a permission grant would fail for the wrong reason and
 * show the user the wrong screen.
 */
export function useBleGate(): Gate {
  const [status, setStatus] = useState<GateStatus>('checking');
  const [adapterState, setAdapterState] = useState<State>();
  const [attempt, setAttempt] = useState(0);
  const subscription = useRef<Subscription | null>(null);
  const probed = useRef(false);
  const probedResult = useRef<GateStatus>('ready');

  const retry = useCallback(() => {
    setStatus('checking');
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const manager = getBleManager();
    probed.current = false;

    /**
     * On API <= 30 a granted location permission still does not mean location
     * services are switched on, and there is no RN API that reports it. A scan
     * is the only thing that knows: it rejects with LocationServicesDisabled
     * (601). Probe with a start/stop pair, which is cheap, instead of adding
     * expo-location purely for `hasServicesEnabledAsync`.
     *
     * The probe resolves on the error OR on a timeout, never races a
     * reject against a resolve: when location is off the error arrives
     * immediately, and when it is on no callback may ever fire in an empty room.
     */
    async function locationServicesDisabled(): Promise<boolean> {
      if (Number(Platform.Version) >= 31) return false;

      let captured: unknown = null;
      try {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 400);
          manager.startDeviceScan(null, null, (error) => {
            if (!error) return; // Devices are irrelevant here; only the error is.
            captured = error;
            clearTimeout(timer);
            resolve();
          });
        });
      } catch (error) {
        // startDeviceScan can throw synchronously rather than call back.
        captured = error;
      } finally {
        manager.stopDeviceScan();
      }

      return (
        typeof captured === 'object' &&
        captured !== null &&
        'errorCode' in captured &&
        captured.errorCode === BleErrorCode.LocationServicesDisabled
      );
    }

    async function run() {
      const permission = await requestBlePermissions();
      if (cancelled) return;

      if (permission === 'blocked') return setStatus('permission-blocked');
      if (permission === 'denied') return setStatus('permission-denied');

      // emitCurrentState: true delivers the state immediately, so there is no
      // window where the UI shows `checking` against an already-off adapter.
      subscription.current = manager.onStateChange(async (next) => {
        if (cancelled) return;
        setAdapterState(next);

        switch (next) {
          case State.PoweredOn: {
            // onStateChange can deliver PoweredOn more than once; probing on
            // each one would thrash start/stopDeviceScan.
            if (probed.current) return setStatus(probedResult.current);
            const disabled = await locationServicesDisabled();
            if (cancelled) return;
            probed.current = true;
            probedResult.current = disabled ? 'location-off' : 'ready';
            return setStatus(probedResult.current);
          }
          case State.PoweredOff:
            return setStatus('bluetooth-off');
          case State.Unauthorized:
            return setStatus('unauthorized');
          case State.Unsupported:
            return setStatus('unsupported');
          default:
            // Resetting and Unknown are momentary; an update is imminent.
            return setStatus('transient');
        }
      }, true);
    }

    run();

    return () => {
      cancelled = true;
      subscription.current?.remove();
      subscription.current = null;
    };
  }, [attempt]);

  return { status, adapterState, retry };
}
