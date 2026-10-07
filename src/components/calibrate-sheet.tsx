import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/** What the sheet confirms. `measured` is null when there was not enough signal to measure. */
export type CalibrationDraft = {
  label: string;
  measured: number | null;
  seconds: number;
  /** Warnings worth reading before saving, already in words. */
  warnings: string[];
  /** The saved reference, when there is one to replace or remove. */
  existing: number | null;
};

/**
 * The 1 m calibration confirm, in the app's own surfaces rather than the
 * system alert: the measured figure is the subject, so it is the big mono
 * number, and warnings sit in their own box instead of trailing the question.
 * Saving overwrites every distance for this device, so nothing saves until
 * the explicit button.
 */
export function CalibrateSheet({
  draft,
  onSave,
  onRemove,
  onClose,
}: {
  draft: CalibrationDraft | null;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const insets = useSafeAreaInsets();
  // The modal's root is laid out short of the gesture bar on edge-to-edge
  // Android, leaving the tab bar showing under the sheet. Sizing the root to
  // the whole screen takes the sheet to the bottom edge.
  const screen = useWindowDimensions();
  const copy = t.hunt.calibrateSheet;

  return (
    <Modal
      visible={draft !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      {draft ? (
        <View style={[styles.root, { height: screen.height }]}>
          <Animated.View entering={FadeIn.duration(160)} style={StyleSheet.absoluteFill}>
            <Pressable
              style={styles.scrim}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
            />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.duration(240)}
            style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}
            accessibilityViewIsModal>
            <View style={styles.grabber} />

            {draft.measured === null ? (
              <>
                <Text style={styles.title} accessibilityRole="header">
                  {copy.notEnoughTitle}
                </Text>
                <Text style={styles.body}>{copy.notEnoughBody(draft.seconds)}</Text>
                <View style={styles.actions}>
                  <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}>
                    <Text style={styles.primaryLabel}>{copy.ok}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title} accessibilityRole="header">
                  {copy.title}
                </Text>

                <View style={styles.reading}>
                  <Text style={styles.figure}>
                    {draft.measured}
                    <Text style={styles.unit}> dBm</Text>
                  </Text>
                  <Text style={styles.caption}>{copy.measured(draft.seconds)}</Text>
                </View>

                <Text style={styles.question}>{copy.question(draft.label)}</Text>
                <Text style={styles.body}>{copy.becomes}</Text>

                {draft.warnings.length > 0 ? (
                  <View style={styles.warning}>
                    <MaterialCommunityIcons
                      name="alert-outline"
                      size={16}
                      color={theme.warning}
                      style={styles.warningIcon}
                    />
                    <View style={styles.warningText}>
                      {draft.warnings.map((warning) => (
                        <Text key={warning} style={styles.warningBody}>
                          {warning}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}>
                    <Text style={styles.secondaryLabel}>{t.common.cancel}</Text>
                  </Pressable>
                  <Pressable
                    onPress={onSave}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}>
                    <Text style={styles.primaryLabel}>{t.common.save}</Text>
                  </Pressable>
                </View>

                {draft.existing !== null ? (
                  <View style={styles.existing}>
                    <Text style={styles.caption}>{copy.current(draft.existing)}</Text>
                    <Pressable onPress={onRemove} hitSlop={12} accessibilityRole="button">
                      {({ pressed }) => (
                        <Text style={[styles.remove, pressed && styles.removePressed]}>
                          {copy.remove}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}
              </>
            )}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    root: { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'flex-end' },
    scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
      backgroundColor: t.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: t.border,
      paddingHorizontal: 20,
      paddingTop: 10,
      gap: 12,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.border,
      marginBottom: 4,
    },
    title: { color: t.textPrimary, fontSize: 18, fontWeight: '700' },
    reading: {
      backgroundColor: t.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 2,
    },
    figure: {
      color: t.signal,
      fontSize: 40,
      fontWeight: '700',
      fontFamily: 'monospace',
      lineHeight: 46,
    },
    unit: { fontSize: 18, fontWeight: '600' },
    caption: { color: t.textTertiary, fontSize: 12 },
    question: { color: t.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: '600' },
    body: { color: t.textSecondary, fontSize: 14, lineHeight: 20 },
    warning: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.warning,
      backgroundColor: t.surfaceRaised,
    },
    warningIcon: { marginTop: 2 },
    warningText: { flex: 1, gap: 6 },
    warningBody: { color: t.textSecondary, fontSize: 13, lineHeight: 18 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    secondary: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
    },
    secondaryPressed: { backgroundColor: t.surfaceRaised },
    secondaryLabel: { color: t.textSecondary, fontSize: 15, fontWeight: '600' },
    // The same amber-on-tint as "Hunt this device", the app's primary action.
    primary: {
      flex: 1,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.signal,
      backgroundColor: `${t.signal}1F`,
    },
    primaryPressed: { backgroundColor: `${t.signal}38` },
    primaryLabel: { color: t.signal, fontSize: 15, fontWeight: '700' },
    existing: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    remove: { color: t.danger, fontSize: 13, fontWeight: '600' },
    removePressed: { opacity: 0.6 },
  });
