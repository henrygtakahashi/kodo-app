import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import type { ErrorBoundaryProps } from 'expo-router';
import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/**
 * What the user sees instead of a white screen when a render throws. Nothing
 * is sent anywhere: the app makes no network calls, so "Copy error details"
 * is how a tester gets the error to the developer.
 */
const APP_NAME = Constants.expoConfig?.name ?? 'The app';

export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const copyDetails = () => {
    const details = [
      `${APP_NAME} ${Constants.expoConfig?.version ?? '?'} · Android ${Platform.Version}`,
      `${error.name}: ${error.message}`,
      error.stack ?? '(no stack)',
    ].join('\n');
    void Clipboard.setStringAsync(details).then(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    );
  };

  return (
    <View style={styles.container}>
      <EmptyState
        art="lost"
        eyebrow="something broke"
        title={`${APP_NAME} hit an error`}
        hint={error.message || 'An unexpected error stopped this screen.'}
        action={{ label: 'Try again', onPress: () => void retry() }}
        secondary={{ label: 'Copy error details', onPress: copyDetails }}
      />
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
  });
