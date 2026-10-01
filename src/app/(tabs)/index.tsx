import { StyleSheet, Text } from 'react-native';

import { useBleGate } from '@/ble/use-ble-gate';
import { GateNotice } from '@/components/gate-notice';
import { Screen } from '@/components/screen';
import { colors } from '@/theme/colors';

// Scanner is the "/" route: v1.0 is built Scanner-first (BRIEF.md §4).
export default function ScannerScreen() {
  const gate = useBleGate();

  if (gate.status !== 'ready') return <GateNotice gate={gate} />;

  return (
    <Screen>
      <Text style={styles.title}>Scanner</Text>
      <Text style={styles.body}>Gate open. Device list lands next.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 16 },
});
