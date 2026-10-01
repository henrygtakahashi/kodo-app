import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

/**
 * Tab screens render under a transparent status bar (the root Stack sets
 * headerShown: false), so they must apply the top inset themselves. The bottom
 * inset is owned by the native tab bar, so it is deliberately not added here.
 */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.container, { paddingTop: insets.top }]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, gap: 8 },
});
