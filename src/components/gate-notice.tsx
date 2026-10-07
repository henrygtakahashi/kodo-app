import { useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import type { Gate } from '@/ble/use-ble-gate';
import { EmptyState, type EmptyArt } from '@/components/empty-state';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

type Copy = {
  art: EmptyArt;
  eyebrow: string;
  title: string;
  body: string;
  action?: { label: string; run: (gate: Gate) => void };
};

const retryAction = { label: 'Try again', run: (gate: Gate) => gate.retry() };

/**
 * Asks the system to show its "Turn on Bluetooth?" dialog. BleManager.enable()
 * calls BluetoothAdapter.enable(), which Android removed for apps targeting
 * SDK 33+: it fails, and the button did nothing. The gate's state listener
 * picks up PoweredOn on its own once the user accepts, so nothing waits here.
 * Falls back to the Bluetooth settings screen if the intent cannot launch.
 */
function requestBluetoothOn() {
  Linking.sendIntent('android.bluetooth.adapter.action.REQUEST_ENABLE').catch(() =>
    Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => Linking.openSettings())
  );
}

/**
 * One screen per gate failure, each with a way out. Copy is distinct per state
 * because "Bluetooth is off" and "permission denied" need different user
 * actions, and a single generic error teaches the user nothing.
 */
const COPY: Record<Exclude<Gate['status'], 'ready'>, Copy> = {
  checking: { art: 'searching', eyebrow: 'starting', title: 'Checking Bluetooth', body: 'One moment.' },
  transient: {
    art: 'searching',
    eyebrow: 'restarting',
    title: 'Bluetooth is restarting',
    body: 'The adapter is resetting. This clears on its own.',
  },
  'permission-denied': {
    art: 'off',
    eyebrow: 'permission',
    title: 'Nearby devices permission needed',
    body: 'Scanning for Bluetooth devices requires permission. Nothing is sent anywhere — the scan is passive and stays on this device.',
    action: retryAction,
  },
  'permission-blocked': {
    art: 'off',
    eyebrow: 'permission',
    title: 'Permission blocked',
    body: 'Android will not ask again, so this has to be changed in system settings. Enable Nearby devices, then come back.',
    action: { label: 'Open settings', run: () => Linking.openSettings() },
  },
  'bluetooth-off': {
    art: 'off',
    eyebrow: 'bluetooth off',
    title: 'Bluetooth is off',
    body: 'Turn Bluetooth on to scan for nearby devices.',
    action: { label: 'Turn on Bluetooth', run: requestBluetoothOn },
  },
  'location-off': {
    art: 'off',
    eyebrow: 'location off',
    title: 'Location services are off',
    body: 'On this version of Android, Bluetooth scanning needs location services switched on. Your location is never used or stored — Android just requires it.',
    action: { label: 'Open settings', run: () => Linking.openSettings() },
  },
  unauthorized: {
    art: 'off',
    eyebrow: 'not authorised',
    title: 'Bluetooth is not authorised',
    body: 'This app is not allowed to use Bluetooth. Grant access in system settings.',
    action: { label: 'Open settings', run: () => Linking.openSettings() },
  },
  // Terminal: no action, because no action exists.
  unsupported: {
    art: 'off',
    eyebrow: 'unsupported',
    title: 'No Bluetooth LE',
    body: 'This device does not support Bluetooth Low Energy, so it cannot scan.',
  },
};

export function GateNotice({ gate }: { gate: Gate }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (gate.status === 'ready') return null;
  const copy = COPY[gate.status];

  return (
    <View style={styles.container}>
      <EmptyState
        // Remount per status so each state gets its own entrance.
        key={gate.status}
        art={copy.art}
        eyebrow={copy.eyebrow}
        title={copy.title}
        hint={copy.body}
        action={copy.action ? { label: copy.action.label, onPress: () => copy.action?.run(gate) } : undefined}
      />
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
  });
