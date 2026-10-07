import { BleErrorCode } from 'react-native-ble-plx';

/**
 * Plain words for a failed scan. ble-plx messages ("Cannot start scanning
 * operation", "BleManager not created…") describe the library, not what the
 * user can do, so each case says what happened and what comes next. The raw
 * error still goes to the log for debugging.
 */
export function friendlyScanError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'errorCode' in error
      ? (error as { errorCode: number }).errorCode
      : null;

  switch (code) {
    case BleErrorCode.BluetoothPoweredOff:
      return 'Bluetooth is off. Turn it on to keep scanning.';
    case BleErrorCode.BluetoothUnauthorized:
      return 'The app is no longer allowed to use Bluetooth. Check its permissions in Settings.';
    case BleErrorCode.LocationServicesDisabled:
      return 'Location is off. This phone needs it switched on to scan.';
    case BleErrorCode.BluetoothResetting:
    case BleErrorCode.BluetoothInUnknownState:
      return 'Bluetooth is restarting. Scanning will resume on its own.';
    case BleErrorCode.ScanStartFailed:
      return 'The phone could not start scanning. It will try again shortly.';
    default:
      return 'Scanning stopped unexpectedly. It will try again shortly.';
  }
}
