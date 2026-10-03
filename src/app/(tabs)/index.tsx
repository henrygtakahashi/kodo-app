import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBle } from '@/ble/ble-provider';
import { GateNotice } from '@/components/gate-notice';
import { ScanToggle } from '@/components/scan-toggle';
import { ScannerControls } from '@/components/scanner-controls';
import { TransmitterList } from '@/components/transmitter-list';
import { Screen } from '@/components/screen';
import { ScreenTitle } from '@/components/screen-title';
import { useDeviceStore } from '@/store/devices';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

// Scanner is the "/" route: v1.0 is built Scanner-first (BRIEF.md §4).
export default function ScannerScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { gate, scanError, retryScan } = useBle();

  // The list subscribes to the id array only. An RSSI change cannot re-render
  // it; each card selects its own values (DESIGN.md §2).
  const order = useDeviceStore((state) => state.order);
  const total = useDeviceStore((state) => Object.keys(state.devices).length);
  const scanning = useDeviceStore((state) => state.scanning);
  // Derived from the filters themselves, not from order.length !== total:
  // `order` lags `devices` by up to the reorder cooldown, so a device found in
  // the last few seconds would otherwise masquerade as an active filter.
  const filtering = useDeviceStore(
    (state) =>
      state.filters.query.trim() !== '' ||
      state.filters.minRssi !== null ||
      state.filters.namedOnly ||
      state.filters.favoritesOnly
  );

  if (gate.status !== 'ready') return <GateNotice gate={gate} />;

  return (
    <Screen>
      <ScreenTitle title="Nearby" trailing={<ScanToggle />} />

      <View style={styles.subheader}>
        <Text style={styles.count}>
          {filtering
            ? `${order.length} of ${total}`
            : `${total} ${total === 1 ? 'transmitter' : 'transmitters'} broadcasting`}
        </Text>
        {!scanning && total > 0 ? <Text style={styles.frozenNote}>Snapshot held</Text> : null}
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

      {total === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyLead}>
            {scanning ? 'Listening.' : 'Scanning paused.'}
          </Text>
          <Text style={styles.emptyHint}>
            {scanning
              ? 'Nothing is broadcasting in range yet.'
              : 'Resume to pick the air back up.'}
          </Text>
        </View>
      ) : order.length === 0 && filtering ? (
        // Filters persist across restarts, so an empty list on launch has to
        // say why rather than look like nothing is broadcasting.
        <View style={styles.empty}>
          <Text style={styles.emptyLead}>Nothing matches.</Text>
          <Text style={styles.emptyHint}>{total} hidden by the active filters.</Text>
        </View>
      ) : (
        <TransmitterList />
      )}
    </Screen>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
  subheader: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  count: { color: t.textTertiary, fontSize: 14 },
  frozenNote: { color: t.warning, fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyLead: { color: t.textPrimary, fontSize: 17, fontWeight: '600' },
  emptyHint: { color: t.textSecondary, fontSize: 14 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.danger,
    backgroundColor: t.surface,
  },
  error: { color: t.danger, fontSize: 13, flex: 1 },
  retry: { color: t.signal, fontSize: 13, fontWeight: '700' },
});
