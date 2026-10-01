import { useCallback } from 'react';
import { FlatList, Keyboard, StyleSheet, Text, View } from 'react-native';

import { useBleGate } from '@/ble/use-ble-gate';
import { useScan } from '@/ble/use-scan';
import { DeviceCard } from '@/components/device-card';
import { GateNotice } from '@/components/gate-notice';
import { ScannerControls } from '@/components/scanner-controls';
import { Screen } from '@/components/screen';
import { useDeviceStore } from '@/store/devices';
import { colors } from '@/theme/colors';

// Scanner is the "/" route: v1.0 is built Scanner-first (BRIEF.md §4).
export default function ScannerScreen() {
  const gate = useBleGate();
  const ready = gate.status === 'ready';
  const { error } = useScan(ready);

  // The list subscribes to the id array only. An RSSI change cannot re-render
  // it; each card selects its own values (DESIGN.md §2).
  const order = useDeviceStore((state) => state.order);
  const total = useDeviceStore((state) => Object.keys(state.devices).length);
  const setFrozen = useDeviceStore((state) => state.setFrozen);

  const renderItem = useCallback(({ item }: { item: string }) => <DeviceCard id={item} />, []);

  if (!ready) return <GateNotice gate={gate} />;

  const filtered = order.length !== total;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Scanner</Text>
        <Text style={styles.count}>
          {filtered ? `${order.length} of ${total}` : `${total} ${total === 1 ? 'device' : 'devices'}`}
        </Text>
      </View>

      <ScannerControls />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={order}
        keyExtractor={(id) => id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => {
          Keyboard.dismiss();
          setFrozen(true);
        }}
        // Freeze re-sorting while a finger is down, or rows move out from
        // under it mid-tap.
        onScrollEndDrag={() => setFrozen(false)}
        onMomentumScrollEnd={() => setFrozen(false)}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {total === 0 ? 'Scanning. Nothing in range yet.' : 'No device matches these filters.'}
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  count: { color: colors.textTertiary, fontSize: 14 },
  list: { gap: 8, paddingBottom: 24 },
  empty: { color: colors.textTertiary, fontSize: 15, textAlign: 'center', marginTop: 48 },
  error: { color: colors.danger, fontSize: 13 },
});
