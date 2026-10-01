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
        <NativeTabs.Trigger name="hunt">
          <NativeTabs.Trigger.Icon sf="location.north.line" md="my_location" />
          <NativeTabs.Trigger.Label>Hunt</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </BleProvider>
  );
}
