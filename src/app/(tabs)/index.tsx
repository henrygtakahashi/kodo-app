import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBle } from '@/ble/ble-provider';
import { EmptyState } from '@/components/empty-state';
import { GateNotice } from '@/components/gate-notice';
import { ScanToggle } from '@/components/scan-toggle';
import { ScannerControls } from '@/components/scanner-controls';
import { TransmitterList } from '@/components/transmitter-list';
import { Screen } from '@/components/screen';
import { ScreenTitle } from '@/components/screen-title';
import { useT } from '@/i18n';
import { useDeviceStore } from '@/store/devices';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

// Scanner is the "/" route: v1.0 is built Scanner-first (BRIEF.md §4).
export default function ScannerScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { gate, scanError, retryScan } = useBle();

  // The list subscribes to the id array only. An RSSI change cannot re-render
  // it; each card selects its own values (DESIGN.md §2).
  const order = useDeviceStore((state) => state.order);
  const total = useDeviceStore((state) => Object.keys(state.devices).length);
  const scanning = useDeviceStore((state) => state.scanning);
  const setScanning = useDeviceStore((state) => state.setScanning);
  const setFilters = useDeviceStore((state) => state.setFilters);
  const clearFilters = useCallback(
    () => setFilters({ query: '', minRssi: null, namedOnly: false, favoritesOnly: false }),
    [setFilters]
  );
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
      <ScreenTitle title={t.nearby.title} trailing={<ScanToggle />} />

      <View style={styles.subheader}>
        <Text style={styles.count}>
          {filtering ? t.nearby.filteredCount(order.length, total) : t.nearby.count(total)}
        </Text>
        {!scanning && total > 0 ? <Text style={styles.frozenNote}>{t.nearby.snapshotHeld}</Text> : null}
      </View>

      <ScannerControls />

      {scanError ? (
        <View style={styles.errorRow}>
          <Text style={styles.error} numberOfLines={2}>
            {t.scanErrors[scanError]}
          </Text>
          {/* A failed scan start never recovers on its own. There is an
              automatic retry, but it waits out Android's 30 s throttle window,
              so offer a manual one rather than leaving the user stuck. */}
          <Pressable onPress={retryScan} hitSlop={8} accessibilityRole="button">
            <Text style={styles.retry}>{t.common.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      {total === 0 ? (
        scanning ? (
          <EmptyState
            art="listening"
            eyebrow={t.nearby.listening.eyebrow}
            showElapsed
            title={t.nearby.listening.title}
            hint={t.nearby.listening.hint}
          />
        ) : (
          <EmptyState
            art="paused"
            eyebrow={t.nearby.paused.eyebrow}
            title={t.nearby.paused.title}
            hint={t.nearby.paused.hint}
            action={{ label: t.nearby.paused.action, onPress: () => setScanning(true) }}
          />
        )
      ) : order.length === 0 && filtering ? (
        // Filters persist across restarts, so an empty list on launch has to
        // say why rather than look like nothing is broadcasting.
        <EmptyState
          art="filtered"
          eyebrow={t.nearby.filtered.eyebrow(total)}
          title={t.nearby.filtered.title}
          hint={t.nearby.filtered.hint}
          action={{ label: t.nearby.filtered.action, onPress: clearFilters }}
        />
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
