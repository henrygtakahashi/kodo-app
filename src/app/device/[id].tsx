import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, mono } from '@/theme/colors';

// Shared detail route, reached from Scanner rows and from a focused Radar blip
// (BRIEF.md §2). Read-only: no connect affordance, ever.
export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Device id</Text>
      <Text style={styles.value}>{id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 4 },
  label: { color: colors.textTertiary, fontSize: 12 },
  value: { color: colors.textPrimary, fontSize: 16, fontFamily: mono },
});
