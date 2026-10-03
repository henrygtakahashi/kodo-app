import { createContext, useContext, type ReactNode } from 'react';

import { useDeviceStore } from '@/store/devices';
import { useBleGate, type Gate } from './use-ble-gate';
import { useScan } from './use-scan';

type BleContextValue = { gate: Gate; scanError: string | null; retryScan: () => void };

const BleContext = createContext<BleContextValue | null>(null);

/**
 * Owns the gate and the scan for the whole app, so there is exactly one.
 *
 * Mounted in the root layout. Owned by a screen, the scan would stop when the
 * user switched tabs; owned by the tab layout, it ran twice whenever a route
 * mounted (tabs) again, and each duplicate leaked an Android scanner.
 */
export function BleProvider({ children }: { children: ReactNode }) {
  const gate = useBleGate();
  const scanning = useDeviceStore((state) => state.scanning);
  const { error, retry } = useScan(gate.status === 'ready' && scanning);

  return (
    <BleContext.Provider value={{ gate, scanError: error, retryScan: retry }}>
      {children}
    </BleContext.Provider>
  );
}

export function useBle(): BleContextValue {
  const value = useContext(BleContext);
  if (!value) throw new Error('useBle must be used inside BleProvider');
  return value;
}
