import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import type { ErrorBoundaryProps } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BleProvider } from '@/ble/ble-provider';
import { CrashScreen } from '@/components/crash-screen';
import { useTheme } from '@/theme/use-theme';

/** Expo Router catches any render error below the root here, so no crash is a white screen. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <CrashScreen {...props} />;
}

export default function RootLayout() {
  const palette = useTheme();

  // Navigation chrome follows the chosen mode. Both palettes share the amber
  // identity, so only the ground and the ink swap.
  const theme = useMemo(() => {
    const base = palette.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: palette.bg,
        card: palette.surface,
        text: palette.textPrimary,
        primary: palette.signal,
        border: palette.border,
      },
    };
  }, [palette]);

  return (
    // Required by gesture-handler. Without it gestures silently do nothing —
    // no error, no warning.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        {/* Root, not the tab layout: a route can mount (tabs) a second time,
            and a second provider means a second scan. ble-plx keeps one scan
            handle, so the second start orphaned the first scanner for good. */}
        <BleProvider>
          <StatusBar style={palette.mode === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.bg },
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="device/[id]" options={{ headerShown: true, title: 'Device' }} />
          </Stack>
        </BleProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
