import { useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import type { Gate } from '@/ble/use-ble-gate';
import { EmptyState, type EmptyArt } from '@/components/empty-state';
import { useT, type Strings } from '@/i18n';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

type Copy = {
  art: EmptyArt;
  text: { eyebrow: string; title: string; body: string };
  action?: { label: (t: Strings) => string; run: (gate: Gate) => void };
};

const retryAction = { label: (t: Strings) => t.common.tryAgain, run: (gate: Gate) => gate.retry() };
const settingsAction = {
  label: (t: Strings) => t.common.openSettings,
  run: () => void Linking.openSettings(),
};

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
function copyFor(status: Exclude<Gate['status'], 'ready'>, t: Strings): Copy {
  const g = t.gate;
  switch (status) {
    case 'checking':
      return { art: 'searching', text: g.checking };
    case 'transient':
      return { art: 'searching', text: g.transient };
    case 'permission-denied':
      return { art: 'off', text: g.permissionDenied, action: retryAction };
    case 'permission-blocked':
      return { art: 'off', text: g.permissionBlocked, action: settingsAction };
    case 'bluetooth-off':
      return {
        art: 'off',
        text: g.bluetoothOff,
        action: { label: (s) => s.gate.bluetoothOff.action, run: requestBluetoothOn },
      };
    case 'location-off':
      return { art: 'off', text: g.locationOff, action: settingsAction };
    case 'unauthorized':
      return { art: 'off', text: g.unauthorized, action: settingsAction };
    // Terminal: no action, because no action exists.
    case 'unsupported':
      return { art: 'off', text: g.unsupported };
  }
}

export function GateNotice({ gate }: { gate: Gate }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  if (gate.status === 'ready') return null;
  const copy = copyFor(gate.status, t);

  return (
    <View style={styles.container}>
      <EmptyState
        // Remount per status so each state gets its own entrance.
        key={gate.status}
        art={copy.art}
        eyebrow={copy.text.eyebrow}
        title={copy.text.title}
        hint={copy.text.body}
        action={
          copy.action
            ? { label: copy.action.label(t), onPress: () => copy.action?.run(gate) }
            : undefined
        }
      />
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
  });
