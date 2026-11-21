import { PermissionsAndroid, Platform } from 'react-native';

export type PermissionOutcome = 'granted' | 'denied' | 'blocked';

/**
 * Android runtime permissions for a passive BLE scan.
 *
 * API 31+ (Android 12): BLUETOOTH_SCAN and BLUETOOTH_CONNECT are both in the
 * "Nearby devices" permission group, so requesting them together costs one
 * dialog, not two. CONNECT is requested even though v1.0 never connects — it is
 * what lets the OS resolve `device.name`, and asking for it is free given the
 * shared group.
 *
 * API <= 30: there is no BLUETOOTH_SCAN. Scanning is gated on fine location
 * instead, and location services must also be switched on (checked separately —
 * a permission grant does not mean the service is running).
 */
export async function requestBlePermissions(): Promise<PermissionOutcome> {
  if (Platform.OS !== 'android') return 'granted';

  const required =
    Number(Platform.Version) >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const result = await PermissionsAndroid.requestMultiple(required);
  const outcomes = Object.values(result);

  if (outcomes.every((o) => o === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';

  // "Blocked" means the OS will no longer show a dialog, so a retry button is a
  // dead end — the only route left is the system settings screen.
  if (outcomes.some((o) => o === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) return 'blocked';

  return 'denied';
}
