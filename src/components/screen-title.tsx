import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/** Tall enough for the Scanning pill, so every tab's title sits on the same line. */
const ROW_HEIGHT = 44;

/**
 * The title row every tab shares. A fixed row height is what keeps titles in
 * the same place: Nearby's row is as tall as its Scanning pill, and a bare
 * title on another tab sat several dp higher.
 */
export function ScreenTitle({
  title,
  leading,
  trailing,
}: {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      {leading}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    row: { minHeight: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { flex: 1, color: t.textPrimary, fontSize: 28, fontWeight: '700' },
  });
