import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

// Placeholder — the Skia canvas (DESIGN.md §4) lands here after Scanner.
export default function RadarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Radar</Text>
      <Text style={styles.body}>Proximity hunter. Radius is real, angle is not.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 8 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 16 },
});
