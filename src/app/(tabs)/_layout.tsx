import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { BleProvider } from '@/ble/ble-provider';

export default function TabsLayout() {
  return (
    <BleProvider>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon
            sf="dot.radiowaves.left.and.right"
            md="bluetooth_searching"
          />
          <NativeTabs.Trigger.Label>Scanner</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="radar">
          <NativeTabs.Trigger.Icon sf="scope" md="radar" />
          <NativeTabs.Trigger.Label>Radar</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </BleProvider>
  );
}
