import { StyleSheet, Text, View } from 'react-native';

import { useBle } from '@/ble/ble-provider';
import { GateNotice } from '@/components/gate-notice';
import { RadarCanvas } from '@/components/radar-canvas';
import { Screen } from '@/components/screen';
import { useDeviceStore } from '@/store/devices';
import { colors } from '@/theme/colors';

export default function RadarScreen() {
  const { gate } = useBle();
  const count = useDeviceStore((state) => state.order.length);

  if (gate.status !== 'ready') return <GateNotice gate={gate} />;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Radar</Text>
        <Text style={styles.count}>{count} tracked</Text>
      </View>

      <RadarCanvas />

      {/* Stated outright, because a radar that shows position is the one thing
          this cannot do. Radius is signal-derived and real; angle is a stable
          hash and means nothing (DESIGN.md §4). */}
      <Text style={styles.disclaimer}>
        Distance only — bearing is not measurable over BLE. Move and watch a blip travel inward.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  count: { color: colors.textTertiary, fontSize: 14 },
  disclaimer: {
    color: colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: 8,
    lineHeight: 16,
  },
});
