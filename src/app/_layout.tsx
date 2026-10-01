import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useTheme } from '@/theme/use-theme';

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
        <StatusBar style={palette.mode === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.bg },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="device/[id]"
            options={{ headerShown: true, title: 'Device' }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
