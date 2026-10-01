import { StyleSheet, Text, View } from 'react-native';

import { useBleGate } from '@/ble/use-ble-gate';
import { GateNotice } from '@/components/gate-notice';
import { colors } from '@/theme/colors';

// Scanner is the "/" route: v1.0 is built Scanner-first (BRIEF.md §4).
export default function ScannerScreen() {
  const gate = useBleGate();

  if (gate.status !== 'ready') return <GateNotice gate={gate} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scanner</Text>
      <Text style={styles.body}>Gate open. Device list lands next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 8 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 16 },
});
