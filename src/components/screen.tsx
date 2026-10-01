import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/**
 * Tab screens render under a transparent status bar (the root Stack sets
 * headerShown: false), so they must apply the top inset themselves. The bottom
 * inset is owned by the native tab bar, so it is deliberately not added here.
 */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return <View style={[styles.container, { paddingTop: insets.top }]}>{children}</View>;
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 16, gap: 8 },
  });
