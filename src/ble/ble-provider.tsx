import { createContext, useContext, type ReactNode } from 'react';

import { useDeviceStore } from '@/store/devices';
import { useBleGate, type Gate } from './use-ble-gate';
import { useScan } from './use-scan';

type BleContextValue = { gate: Gate; scanError: string | null };

const BleContext = createContext<BleContextValue | null>(null);

/**
 * Owns the gate and the scan for every tab.
 *
 * This sits above the tab navigator on purpose. Owned by the Scanner screen,
 * the scan would stop the moment the user switched to Radar, and both tabs
 * render the same store.
 */
export function BleProvider({ children }: { children: ReactNode }) {
  const gate = useBleGate();
  const scanning = useDeviceStore((state) => state.scanning);
  const { error } = useScan(gate.status === 'ready' && scanning);

  return (
    <BleContext.Provider value={{ gate, scanError: error }}>{children}</BleContext.Provider>
  );
}

export function useBle(): BleContextValue {
  const value = useContext(BleContext);
  if (!value) throw new Error('useBle must be used inside BleProvider');
  return value;
}
