import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Canvas } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import { memo, useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import {
  advertisingIntervalMs,
  type DeviceRecord,
  favoriteMatch,
  useDeviceStore,
} from '@/store/devices';
import { useFavoritesStore } from '@/store/favorites';
import { KIND_LABELS } from '@/ble/kind';
import { bandFor } from '@/ble/signal';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';
import { CadenceStrip } from './cadence-strip';
import { KindIcon } from './kind-icon';

export const ROW_HEIGHT = 68;
const STRIP_INSET = 16;
const LABEL_WIDTH = 150;
const RIGHT_WIDTH = 78;
const CHEVRON_WIDTH = 16;
/** How often the cadence strips' time axis advances. */
const CLOCK_MS = 100;
/** A dBm move this large shows at once; smaller ones wait for READOUT_MS. */
const READOUT_JUMP_DBM = 3;
/** Readouts change at most this often: 8 Hz jitter is unreadable anyway. */
const READOUT_MS = 500;

type RowData = ReturnType<typeof readRow>;

function readRow(record: DeviceRecord | undefined) {
  const interval = record ? advertisingIntervalMs(record) : null;
  const label = record?.identity.label ?? '—';
  const vendor = record?.identity.vendor ?? null;
  const suffix = record?.identity.suffix ?? '';
  return {
    label,
    // The vendor joins the id chip only when the label does not already say
    // it, e.g. "Galaxy Watch8" but not "[TV] Samsung AU77" or a bare "Samsung".
    chip:
      vendor && !label.toLowerCase().includes(vendor.toLowerCase())
        ? `${vendor.toUpperCase()}·${suffix}`
        : suffix,
    kind: record?.identity.kind?.kind ?? null,
    favorite: record ? favoriteMatch(record) !== null : false,
    hue: record?.hue ?? 160,
    band: bandFor(record?.smoothed ?? -127),
    dbm: Math.round(record?.smoothed ?? -127),
    interval,
    stale: record?.staleness === 'stale',
  };
}

/**
 * The smoothed dBm and the mean interval shift a little on nearly every flush,
 * which re-rendered every row 8 times a second for digits nobody can read at
 * that rate. Identity and staleness show at once; readouts at most every
 * READOUT_MS, unless the signal jumps.
 */
function worthShowing(shown: RowData, next: RowData, elapsed: number): boolean {
  if (
    shown.label !== next.label ||
    shown.chip !== next.chip ||
    shown.kind !== next.kind ||
    shown.favorite !== next.favorite ||
    shown.stale !== next.stale ||
    shown.band !== next.band
  ) {
    return true;
  }
  if (shown.dbm === next.dbm && shown.interval === next.interval) return false;
  return Math.abs(shown.dbm - next.dbm) >= READOUT_JUMP_DBM || elapsed >= READOUT_MS;
}

function formatInterval(ms: number | null): string {
  if (ms === null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

const Row = memo(function Row({ id }: { id: string }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [row, setRow] = useState(() => readRow(useDeviceStore.getState().devices[id]));

  useEffect(() => {
    let last = useDeviceStore.getState().devices[id];
    let shown = readRow(last);
    let shownAt = Date.now();
    setRow(shown);

    const show = (next: RowData) => {
      shown = next;
      shownAt = Date.now();
      setRow(next);
    };

    // Starring happens on the detail screen; the row must reflect it at once.
    const unsubscribeFavorites = useFavoritesStore.subscribe(() => show(readRow(last)));

    const unsubscribeDevices = useDeviceStore.subscribe((state) => {
      const record = state.devices[id];
      // Every row hears every store write; `merge` only replaces records that
      // received packets, so an unchanged object means nothing to do.
      if (record === last) return;
      last = record;

      const next = readRow(record);
      const now = Date.now();
      if (!worthShowing(shown, next, now - shownAt)) return;
      show(next);
    });

    return () => {
      unsubscribeFavorites();
      unsubscribeDevices();
    };
  }, [id]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, row.stale && styles.stale, pressed && styles.pressed]}
      onPress={() => router.push({ pathname: '/device/[id]', params: { id } })}
      accessibilityRole="button"
      accessibilityLabel={`${row.favorite ? 'Favorite, ' : ''}${row.label}${row.kind ? `, ${KIND_LABELS[row.kind]}` : ''}, ${row.dbm} dBm, every ${formatInterval(row.interval)}`}
      accessibilityHint="Opens device details">
      <View style={styles.labelCell}>
        <View style={styles.title}>
          {row.favorite && (
            <MaterialCommunityIcons name="star" size={14} color={theme.signal} />
          )}
          {row.kind && <KindIcon kind={row.kind} size={14} color={theme.textTertiary} />}
          <Text style={styles.label} numberOfLines={1}>
            {row.label}
          </Text>
        </View>
        <View style={styles.subline}>
          <View style={[styles.chip, { backgroundColor: theme.chipFill(row.hue) }]}>
            <Text style={[styles.chipText, { color: theme.chipInk(row.hue) }]} numberOfLines={1}>
              {row.chip}
            </Text>
          </View>
          <Text style={[styles.band, { color: theme.bands[row.band] }]}>{row.band}</Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={styles.right}>
        <Text style={styles.interval}>{formatInterval(row.interval)}</Text>
        <Text style={styles.dbm}>
          {row.dbm}
          <Text style={styles.unit}> dBm</Text>
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
});

export function TransmitterList() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const order = useDeviceStore((state) => state.order);
  const setFrozen = useDeviceStore((state) => state.setFrozen);
  const [width, setWidth] = useState(0);

  const clock = useSharedValue(Date.now());

  // One shared clock slides every strip's window, at a steady 10 Hz rather than
  // per store write (12 per second, bunched). It stops with the scan, so a
  // paused list holds still like the snapshot it is.
  const scanning = useDeviceStore((state) => state.scanning);
  useEffect(() => {
    if (!scanning) return;
    clock.set(Date.now());
    const timer = setInterval(() => clock.set(Date.now()), CLOCK_MS);
    return () => clearInterval(timer);
  }, [scanning, clock]);

  const stripX = LABEL_WIDTH;
  const stripWidth = Math.max(0, width - LABEL_WIDTH - RIGHT_WIDTH - CHEVRON_WIDTH - 8);

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.axis}>
        <Text style={[styles.axisLabel, styles.axisDevice]}>device</Text>
        <Text style={[styles.axisLabel, styles.axisWindow]}>last 10s → now</Text>
        <Text style={[styles.axisLabel, styles.axisUnits]}>interval</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ height: order.length * ROW_HEIGHT }}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => {
          Keyboard.dismiss();
          setFrozen(true);
        }}
        onScrollEndDrag={() => setFrozen(false)}
        onMomentumScrollEnd={() => setFrozen(false)}>
        {/* One canvas for every strip. A canvas per row is one native surface
            per device, which is what kills a list like this. */}
        {width > 0 && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            {order.map((id, index) => (
              <CadenceStrip
                key={id}
                id={id}
                x={stripX}
                y={index * ROW_HEIGHT + STRIP_INSET}
                width={stripWidth}
                height={ROW_HEIGHT - STRIP_INSET * 2}
                track={theme.track}
                clock={clock}
              />
            ))}
          </Canvas>
        )}

        {order.map((id) => (
          <Row key={id} id={id} />
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
  container: { flex: 1 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 },
  axisLabel: { color: t.textTertiary, fontSize: 11 },
  axisDevice: { width: LABEL_WIDTH },
  axisWindow: { flex: 1 },
  axisUnits: { paddingRight: CHEVRON_WIDTH },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  stale: { opacity: 0.45 },
  pressed: { backgroundColor: t.surfaceRaised },
  labelCell: { width: LABEL_WIDTH, paddingRight: 10, gap: 4 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { flexShrink: 1, color: t.textPrimary, fontSize: 15, fontWeight: '600' },
  subline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: { flexShrink: 1, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  chipText: { fontSize: 10, fontFamily: 'monospace' },
  band: { fontSize: 11 },
  spacer: { flex: 1 },
  right: { width: RIGHT_WIDTH, alignItems: 'flex-end', gap: 2 },
  interval: { color: t.textPrimary, fontSize: 14, fontFamily: 'monospace' },
  dbm: { color: t.textTertiary, fontSize: 12, fontFamily: 'monospace' },
  unit: { fontSize: 11 },
  chevron: { width: CHEVRON_WIDTH, textAlign: 'right', color: t.textTertiary, fontSize: 17 },
});
