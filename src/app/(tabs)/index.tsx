import { useCallback } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { useBle } from '@/ble/ble-provider';
import { DeviceCard } from '@/components/device-card';
import { GateNotice } from '@/components/gate-notice';
import { ScanToggle } from '@/components/scan-toggle';
import { ScannerControls } from '@/components/scanner-controls';
import { Screen } from '@/components/screen';
import { useDeviceStore } from '@/store/devices';
import { colors } from '@/theme/colors';

// Scanner is the "/" route: v1.0 is built Scanner-first (BRIEF.md §4).
export default function ScannerScreen() {
  const { gate, scanError, retryScan } = useBle();

  // The list subscribes to the id array only. An RSSI change cannot re-render
  // it; each card selects its own values (DESIGN.md §2).
  const order = useDeviceStore((state) => state.order);
  const total = useDeviceStore((state) => Object.keys(state.devices).length);
  const scanning = useDeviceStore((state) => state.scanning);
  const setFrozen = useDeviceStore((state) => state.setFrozen);
  // Derived from the filters themselves, not from order.length !== total:
  // `order` lags `devices` by up to the reorder cooldown, so a device found in
  // the last few seconds would otherwise masquerade as an active filter.
  const filtering = useDeviceStore(
    (state) =>
      state.filters.query.trim() !== '' ||
      state.filters.minRssi !== null ||
      state.filters.namedOnly
  );

  const renderItem = useCallback(({ item }: { item: string }) => <DeviceCard id={item} />, []);

  if (gate.status !== 'ready') return <GateNotice gate={gate} />;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Scanner</Text>
        <ScanToggle />
      </View>

      <View style={styles.subheader}>
        <Text style={styles.count}>
          {filtering
            ? `${order.length} of ${total}`
            : `${total} ${total === 1 ? 'device' : 'devices'}`}
        </Text>
        {!scanning && total > 0 ? (
          <Text style={styles.frozenNote}>Snapshot held</Text>
        ) : null}
      </View>

      <ScannerControls />

      {scanError ? (
        <View style={styles.errorRow}>
          <Text style={styles.error} numberOfLines={2}>
            {scanError}
          </Text>
          {/* A failed scan start never recovers on its own. There is an
              automatic retry, but it waits out Android's 30 s throttle window,
              so offer a manual one rather than leaving the user stuck. */}
          <Pressable onPress={retryScan} hitSlop={8} accessibilityRole="button">
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

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
            {!scanning
              ? 'Scanning paused.'
              : total === 0
                ? 'Scanning. Nothing in range yet.'
                : 'No device matches these filters.'}
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subheader: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
  count: { color: colors.textTertiary, fontSize: 14 },
  frozenNote: { color: colors.warning, fontSize: 12 },
  list: { gap: 8, paddingBottom: 24 },
  empty: { color: colors.textTertiary, fontSize: 15, textAlign: 'center', marginTop: 48 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  error: { color: colors.danger, fontSize: 13, flex: 1 },
  retry: { color: colors.signal, fontSize: 13, fontWeight: '700' },
});
