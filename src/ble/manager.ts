import { NativeModules } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

let instance: BleManager | null = null;

/**
 * BleManager owns native resources and must exist exactly once per process.
 * Constructing a second one leaks the first and produces duplicate state events.
 *
 * ble-plx's native `createClient` replaces its adapter without stopping the
 * old one's scan, so a second client creation (a JS reload, say) could leave
 * a scanner registered for good. Destroying whatever client the native side
 * still holds costs nothing and closes that path. Both calls go through the
 * same native module queue, so the destroy lands before the create; on a cold
 * start there is no client and the rejection is expected.
 *
 * The leak actually seen on device (27 scanners, then "Cannot start scanning
 * operation") had a different cause: a second BleProvider; see ble-provider.tsx.
 */
export function getBleManager(): BleManager {
  if (!instance) {
    NativeModules.BlePlx?.destroyClient?.().catch(() => undefined);
    instance = new BleManager();
  }
  return instance;
}
