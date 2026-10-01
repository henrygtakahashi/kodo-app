import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { useTheme, useThemeStore } from '@/theme/use-theme';
import { themes, type Palette, type ThemeMode } from '@/theme/themes';

const MODES: { mode: ThemeMode; title: string; blurb: string }[] = [
  { mode: 'dark', title: 'Night', blurb: 'Amber on deep brown-black. Best indoors and after dark.' },
  { mode: 'light', title: 'Daylight', blurb: 'The same amber pressed into warm paper. Readable in sun.' },
];

/** A swatch of the real palette, so the choice is shown rather than described. */
function Preview({ palette }: { palette: Palette }) {
  return (
    <View style={[previewStyles.frame, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={[previewStyles.bar, { backgroundColor: palette.signal, width: '70%' }]} />
      <View style={[previewStyles.bar, { backgroundColor: palette.bands.near, width: '48%' }]} />
      <View style={[previewStyles.bar, { backgroundColor: palette.bands.far, width: '32%' }]} />
      <View style={[previewStyles.bar, { backgroundColor: palette.bands.distant, width: '20%' }]} />
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>Theme</Text>

        {MODES.map((entry) => {
          const active = mode === entry.mode;
          return (
            <Pressable
              key={entry.mode}
              onPress={() => setMode(entry.mode)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && styles.optionPressed,
              ]}>
              <Preview palette={themes[entry.mode]} />
              <View style={styles.optionBody}>
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {entry.title}
                </Text>
                <Text style={styles.optionBlurb}>{entry.blurb}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.note}>
          The choice is not saved yet, so it returns to Night when the app restarts.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const previewStyles = StyleSheet.create({
  frame: {
    width: 56,
    height: 44,
    borderRadius: 3,
    borderWidth: 1,
    padding: 5,
    justifyContent: 'center',
    gap: 3,
  },
  bar: { height: 4, borderRadius: 1 },
});

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    title: { color: t.textPrimary, fontSize: 28, fontWeight: '700' },
    body: { gap: 10, paddingTop: 8, paddingBottom: 32 },
    sectionLabel: { color: t.textTertiary, fontSize: 12, letterSpacing: 1 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    optionActive: { borderColor: t.signal },
    optionPressed: { backgroundColor: t.surfaceRaised },
    optionBody: { flex: 1, gap: 2 },
    optionTitle: { color: t.textPrimary, fontSize: 16, fontWeight: '600' },
    optionTitleActive: { color: t.signal },
    optionBlurb: { color: t.textSecondary, fontSize: 13, lineHeight: 18 },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: t.signal },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.signal },
    note: { color: t.textTertiary, fontSize: 12, lineHeight: 17, marginTop: 6 },
  });
