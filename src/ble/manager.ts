import { BleManager } from 'react-native-ble-plx';

let instance: BleManager | null = null;

/**
 * BleManager owns native resources and must exist exactly once per process.
 * Constructing a second one leaks the first and produces duplicate state events.
 */
export function getBleManager(): BleManager {
  if (!instance) instance = new BleManager();
  return instance;
}
