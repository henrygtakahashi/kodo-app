import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';

import { colors } from '@/theme/colors';

// Dark-only by design (DESIGN.md §9), so no useColorScheme branch.
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.textPrimary,
    primary: colors.signal,
    border: colors.border,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={theme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="device/[id]"
          options={{ headerShown: true, title: 'Device' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
