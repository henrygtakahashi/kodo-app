import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useT } from '@/i18n';
import { useTheme } from '@/theme/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  const t = useT();

  // The native tab bar takes its colours from the platform theme, which on
  // Android is Material blue and fights the amber palette.
  return (
    <NativeTabs
      backgroundColor={theme.surface}
      tintColor={theme.signal}
      iconColor={{ default: theme.textTertiary, selected: theme.signal }}
      // Unselected labels otherwise fall back to Material blue.
      labelStyle={{
        default: { color: theme.textTertiary },
        selected: { color: theme.signal },
      }}
      indicatorColor={theme.surfaceRaised}
      rippleColor={theme.surfaceRaised}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="dot.radiowaves.left.and.right" md="bluetooth_searching" />
        <NativeTabs.Trigger.Label>{t.tabs.nearby}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="hunt">
        <NativeTabs.Trigger.Icon sf="location.north.line" md="my_location" />
        <NativeTabs.Trigger.Label>{t.tabs.hunt}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" md="tune" />
        <NativeTabs.Trigger.Label>{t.tabs.settings}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
