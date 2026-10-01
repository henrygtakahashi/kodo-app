import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

// Scanner is the "/" route: v1.0 is built Scanner-first (BRIEF.md §4).
// Placeholder — the gate chain (BRIEF.md §0) lands here next.
export default function ScannerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scanner</Text>
      <Text style={styles.body}>Discovery & diagnostics. Passive listening only.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 8 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 16 },
});
