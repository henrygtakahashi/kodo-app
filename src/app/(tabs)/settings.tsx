import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ScreenTitle } from '@/components/screen-title';
import { useLanguageStore, useT, type LanguagePref } from '@/i18n';
import { useTheme, useThemeStore } from '@/theme/use-theme';
import { themes, type Palette, type ThemeId } from '@/theme/themes';

const THEMES: ThemeId[] = ['graphite', 'night'];

const LANGUAGES: LanguagePref[] = ['system', 'en', 'pt-BR'];

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
  const themeId = useThemeStore((state) => state.themeId);
  const setThemeId = useThemeStore((state) => state.setThemeId);
  const t = useT();
  const languagePref = useLanguageStore((state) => state.pref);
  const systemLanguage = useLanguageStore((state) => state.system);
  const setLanguagePref = useLanguageStore((state) => state.setPref);

  return (
    <Screen>
      <ScreenTitle title={t.settings.title} />

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>{t.settings.theme}</Text>

        {THEMES.map((id) => {
          const active = themeId === id;
          const entry = t.settings.themes[id];
          return (
            <Pressable
              key={id}
              onPress={() => setThemeId(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && styles.optionPressed,
              ]}>
              <Preview palette={themes[id]} />
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

        <Text style={[styles.sectionLabel, styles.sectionGap]}>{t.settings.language}</Text>

        {/* Each language is named in itself, so someone who cannot read the
            current one can still find their own. */}
        {LANGUAGES.map((pref) => {
          const active = languagePref === pref;
          return (
            <Pressable
              key={pref}
              onPress={() => setLanguagePref(pref)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                active && styles.optionActive,
                pressed && styles.optionPressed,
              ]}>
              <View style={styles.optionBody}>
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {t.settings.languages[pref]}
                </Text>
                {pref === 'system' ? (
                  <Text style={styles.optionBlurb}>
                    {t.settings.systemHint(t.settings.languages[systemLanguage])}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}

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
    body: { gap: 10, paddingTop: 8, paddingBottom: 32 },
    sectionLabel: { color: t.textTertiary, fontSize: 12, letterSpacing: 1 },
    sectionGap: { marginTop: 14 },
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
