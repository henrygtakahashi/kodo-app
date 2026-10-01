import { StyleSheet, Text, View } from 'react-native';

import { useBle } from '@/ble/ble-provider';
import { GateNotice } from '@/components/gate-notice';
import { Screen } from '@/components/screen';
import { SignalWall } from '@/components/signal-wall';
import { useDeviceStore } from '@/store/devices';
import { colors } from '@/theme/colors';

export default function SignalScreen() {
  const { gate } = useBle();
  const count = useDeviceStore((state) => state.order.length);

  if (gate.status !== 'ready') return <GateNotice gate={gate} />;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Signal</Text>
        <Text style={styles.count}>{count} tracked</Text>
      </View>

      <SignalWall />

      <Text style={styles.hint}>
        Rising trace means you are getting closer. Walk, and watch which one climbs.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  count: { color: colors.textTertiary, fontSize: 14 },
  hint: {
    color: colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
    lineHeight: 16,
  },
});
