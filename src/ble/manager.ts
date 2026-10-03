import { NativeModules } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

let instance: BleManager | null = null;

/**
 * BleManager owns native resources and must exist exactly once per process.
 * Constructing a second one leaks the first and produces duplicate state events.
 *
 * Defensive: ble-plx's native `createClient` replaces its adapter without
 * stopping the old one's scan, so any second client creation (a JS reload is
 * the obvious one) could leave a scanner registered. On device the app once
 * held 27 scanners in one process, hit Android's limit of about 32, and every
 * start failed with "Cannot start scanning operation". The trigger was not
 * reproduced: reloads, rescans, pause/resume and backgrounding all held one
 * scanner. Destroying whatever client the native side still holds costs
 * nothing and closes this path. Both calls go through the same native module
 * queue, so the destroy lands before the create; on a cold start there is no
 * client and the rejection is expected.
 */
export function getBleManager(): BleManager {
  if (!instance) {
    NativeModules.BlePlx?.destroyClient?.().catch(() => undefined);
    instance = new BleManager();
  }
  return instance;
}
