import { useMemo } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { getBleManager } from '@/ble/manager';
import type { Gate } from '@/ble/use-ble-gate';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

type Copy = {
  title: string;
  body: string;
  action?: { label: string; run: (gate: Gate) => void };
};

const retryAction = { label: 'Try again', run: (gate: Gate) => gate.retry() };

/**
 * One screen per gate failure, each with a way out. Copy is distinct per state
 * because "Bluetooth is off" and "permission denied" need different user
 * actions, and a single generic error teaches the user nothing.
 */
const COPY: Record<Exclude<Gate['status'], 'ready'>, Copy> = {
  checking: { title: 'Checking Bluetooth', body: 'One moment.' },
  transient: {
    title: 'Bluetooth is restarting',
    body: 'The adapter is resetting. This clears on its own.',
  },
  'permission-denied': {
    title: 'Nearby devices permission needed',
    body: 'Scanning for Bluetooth devices requires permission. Nothing is sent anywhere — the scan is passive and stays on this device.',
    action: retryAction,
  },
  'permission-blocked': {
    title: 'Permission blocked',
    body: 'Android will not ask again, so this has to be changed in system settings. Enable Nearby devices, then come back.',
    action: { label: 'Open settings', run: () => Linking.openSettings() },
  },
  'bluetooth-off': {
    title: 'Bluetooth is off',
    body: 'Turn Bluetooth on to scan for nearby devices.',
    action: {
      label: 'Turn on Bluetooth',
      // Android-only API; it is a no-op to call it anywhere else, and this app
      // is Android-only for now.
      run: () => void getBleManager().enable().catch(() => undefined),
    },
  },
  'location-off': {
    title: 'Location services are off',
    body: 'On this version of Android, Bluetooth scanning needs location services switched on. Your location is never used or stored — Android just requires it.',
    action: { label: 'Open settings', run: () => Linking.openSettings() },
  },
  unauthorized: {
    title: 'Bluetooth is not authorised',
    body: 'This app is not allowed to use Bluetooth. Grant access in system settings.',
    action: { label: 'Open settings', run: () => Linking.openSettings() },
  },
  // Terminal: no action, because no action exists.
  unsupported: {
    title: 'No Bluetooth LE',
    body: 'This device does not support Bluetooth Low Energy, so it cannot scan.',
  },
};

export function GateNotice({ gate }: { gate: Gate }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (gate.status === 'ready') return null;
  const copy = COPY[gate.status];
  const busy = gate.status === 'checking' || gate.status === 'transient';

  return (
    <View style={styles.container}>
      {busy ? <ActivityIndicator color={theme.signal} /> : null}
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      {copy.action ? (
        <Pressable
          style={styles.button}
          hitSlop={8}
          onPress={() => copy.action?.run(gate)}
          accessibilityRole="button">
          <Text style={styles.buttonLabel}>{copy.action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { color: t.textPrimary, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  body: { color: t.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.signal,
  },
  buttonLabel: { color: t.signal, fontSize: 16, fontWeight: '600' },
});
