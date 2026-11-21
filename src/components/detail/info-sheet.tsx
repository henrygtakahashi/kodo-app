import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheet, Column, Host, Text as NativeText } from '@expo/ui';
import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useT } from '@/i18n';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';
import type { Term } from './glossary';

/** The ⓘ next to a term. Opens the explanation sheet. */
export function InfoButton({ term, onInfo }: { term: Term; onInfo: (term: Term) => void }) {
  const theme = useTheme();
  const t = useT();
  return (
    <Pressable
      onPress={() => onInfo(term)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={t.glossary.whatIs(t.glossary[term].title)}>
      <MaterialCommunityIcons name="information-outline" size={15} color={theme.textTertiary} />
    </Pressable>
  );
}

/**
 * One native sheet for every term. The content is native text too: React
 * Native text inside the Compose sheet was measured without a width and ran
 * off the edge on one line instead of wrapping.
 */
export function InfoSheet({ term, onClose }: { term: Term | null; onClose: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const entry = term ? t.glossary[term] : null;

  return (
    <Host style={styles.host}>
      <BottomSheet
        isPresented={term !== null}
        onDismiss={onClose}
        containerColor={theme.surface}
        scrimColor="rgba(0,0,0,0.55)">
        <Column spacing={12} style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 32 }}>
          <NativeText textStyle={{ color: theme.textPrimary, fontSize: 18, fontWeight: '700' }}>
            {entry?.title ?? ''}
          </NativeText>
          <NativeText textStyle={{ color: theme.textSecondary, fontSize: 15, lineHeight: 22 }}>
            {entry?.body ?? ''}
          </NativeText>
        </Column>
      </BottomSheet>
    </Host>
  );
}

const makeStyles = (_t: Palette) =>
  StyleSheet.create({
    // The host only anchors the sheet; it takes no space in the layout.
    host: { position: 'absolute', width: 0, height: 0 },
  });
