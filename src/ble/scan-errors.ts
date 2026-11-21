import { BleErrorCode } from 'react-native-ble-plx';

import type { Strings } from '@/i18n/en';

export type ScanErrorKey = keyof Strings['scanErrors'];

/**
 * Which plain-words message a failed scan gets. ble-plx messages ("Cannot
 * start scanning operation", "BleManager not created…") describe the library,
 * not what the user can do, so each case says what happened and what comes
 * next. A key rather than the text, so the message follows a language change.
 * The raw error still goes to the log for debugging.
 */
export function friendlyScanError(error: unknown): ScanErrorKey {
  const code =
    typeof error === 'object' && error !== null && 'errorCode' in error
      ? (error as { errorCode: number }).errorCode
      : null;

  switch (code) {
    case BleErrorCode.BluetoothPoweredOff:
      return 'poweredOff';
    case BleErrorCode.BluetoothUnauthorized:
      return 'unauthorized';
    case BleErrorCode.LocationServicesDisabled:
      return 'locationOff';
    case BleErrorCode.BluetoothResetting:
    case BleErrorCode.BluetoothInUnknownState:
      return 'resetting';
    case BleErrorCode.ScanStartFailed:
      return 'startFailed';
    default:
      return 'other';
  }
}
