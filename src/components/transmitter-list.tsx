import { Canvas } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import { memo, useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { advertisingIntervalMs, useDeviceStore } from '@/store/devices';
import { bandFor } from '@/ble/signal';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';
import { CadenceStrip } from './cadence-strip';

export const ROW_HEIGHT = 68;
const STRIP_INSET = 16;
const LABEL_WIDTH = 150;
const RIGHT_WIDTH = 78;

function readRow(id: string) {
  const record = useDeviceStore.getState().devices[id];
  const interval = record ? advertisingIntervalMs(record) : null;
  return {
    label: record?.identity.label ?? '—',
    suffix: record?.identity.suffix ?? '',
    hue: record?.hue ?? 160,
    band: bandFor(record?.smoothed ?? -127),
    dbm: Math.round(record?.smoothed ?? -127),
    interval,
    stale: record?.staleness === 'stale',
  };
}

function formatInterval(ms: number | null): string {
  if (ms === null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

const Row = memo(function Row({ id }: { id: string }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [row, setRow] = useState(() => readRow(id));

  useEffect(() => {
    setRow(readRow(id));
    return useDeviceStore.subscribe(() => {
      const next = readRow(id);
      setRow((prev) =>
        prev.dbm === next.dbm &&
        prev.interval === next.interval &&
        prev.label === next.label &&
        prev.stale === next.stale
          ? prev
          : next
      );
    });
  }, [id]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, row.stale && styles.stale, pressed && styles.pressed]}
      onPress={() => router.push({ pathname: '/device/[id]', params: { id } })}
      accessibilityRole="button"
      accessibilityLabel={`${row.label}, ${row.dbm} dBm, every ${formatInterval(row.interval)}`}>
      <View style={styles.labelCell}>
        <Text style={styles.label} numberOfLines={1}>
          {row.label}
        </Text>
        <View style={styles.subline}>
          <View style={[styles.chip, { backgroundColor: theme.chipFill(row.hue) }]}>
            <Text style={[styles.chipText, { color: theme.chipInk(row.hue) }]}>{row.suffix}</Text>
          </View>
          <Text style={[styles.band, { color: theme.bands[row.band] }]}>{row.band}</Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={styles.right}>
        <Text style={styles.interval}>{formatInterval(row.interval)}</Text>
        <Text style={styles.dbm}>{row.dbm}</Text>
      </View>
    </Pressable>
  );
});

export function TransmitterList() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const order = useDeviceStore((state) => state.order);
  const setFrozen = useDeviceStore((state) => state.setFrozen);
  const [width, setWidth] = useState(0);

  const stripX = LABEL_WIDTH;
  const stripWidth = Math.max(0, width - LABEL_WIDTH - RIGHT_WIDTH - 8);

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.axis}>
        <Text style={styles.axisLabel}>cadence, last 10s</Text>
        <Text style={styles.axisLabel}>every</Text>
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
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  stale: { opacity: 0.45 },
  pressed: { backgroundColor: t.surfaceRaised },
  labelCell: { width: LABEL_WIDTH, paddingRight: 10, gap: 4 },
  label: { color: t.textPrimary, fontSize: 15, fontWeight: '600' },
  subline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  chipText: { fontSize: 10, fontFamily: 'monospace' },
  band: { fontSize: 11 },
  spacer: { flex: 1 },
  right: { width: RIGHT_WIDTH, alignItems: 'flex-end', gap: 2 },
  interval: { color: t.textPrimary, fontSize: 14, fontFamily: 'monospace' },
  dbm: { color: t.textTertiary, fontSize: 12, fontFamily: 'monospace' },
});
