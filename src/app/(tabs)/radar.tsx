import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/theme/colors';

// Placeholder — the Skia canvas (DESIGN.md §4) lands here after Scanner.
export default function RadarScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Radar</Text>
      <Text style={styles.body}>Proximity hunter. Radius is real, angle is not.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  body: { color: colors.textSecondary, fontSize: 16 },
});
