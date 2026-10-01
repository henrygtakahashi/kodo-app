import { Canvas } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HISTORY_SECONDS, useDeviceStore } from '@/store/devices';
import { bandFor, trendOf, type Trend } from '@/ble/signal';
import { bands, colors, mono } from '@/theme/colors';
import { SignalTrace } from './signal-trace';

export const ROW_HEIGHT = 64;
const TRACE_INSET_Y = 12;
const LABEL_WIDTH = 132;
const READOUT_WIDTH = 84;

const TREND_MARK: Record<Trend, string> = {
  approaching: '▲',
  receding: '▼',
  steady: '·',
};

function trendColour(trend: Trend): string {
  if (trend === 'approaching') return bands.immediate;
  if (trend === 'receding') return colors.textTertiary;
  return colors.textSecondary;
}

/**
 * Label and readout for one row. Subscribes to its own primitives only, so a
 * device's own change repaints one row rather than the wall.
 */
const Row = memo(function Row({ id }: { id: string }) {
  const [state, setState] = useState(() => readRow(id));

  useEffect(() => {
    setState(readRow(id));
    // Sampled at 4 Hz, not per packet; this is a derived cadence, not the
    // advertisement stream.
    return useDeviceStore.subscribe(() => {
      const next = readRow(id);
      setState((previous) =>
        previous.label === next.label &&
        previous.dbm === next.dbm &&
        previous.trend === next.trend &&
        previous.stale === next.stale
          ? previous
          : next
      );
    });
  }, [id]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        state.stale && styles.stale,
        pressed && styles.pressed,
      ]}
      onPress={() => router.push({ pathname: '/device/[id]', params: { id } })}
      accessibilityRole="button"
      accessibilityLabel={`${state.label}, ${state.dbm} dBm, ${state.trend}`}>
      <View style={styles.labelCell}>
        <Text style={styles.label} numberOfLines={1}>
          {state.label}
        </Text>
        <Text style={styles.suffix}>{state.suffix}</Text>
      </View>

      <View style={styles.spacer} />

      <View style={styles.readout}>
        <Text style={[styles.dbm, { color: bands[bandFor(state.dbm)] }]}>{state.dbm}</Text>
        <Text style={[styles.trend, { color: trendColour(state.trend) }]}>
          {TREND_MARK[state.trend]}
        </Text>
      </View>
    </Pressable>
  );
});

function readRow(id: string) {
  const record = useDeviceStore.getState().devices[id];
  return {
    label: record?.identity.label ?? '—',
    suffix: record?.identity.suffix ?? '',
    dbm: Math.round(record?.smoothed ?? -127),
    trend: trendOf(record?.history ?? []),
    stale: record?.staleness === 'stale',
  };
}

export function SignalWall() {
  const order = useDeviceStore((state) => state.order);
  const [width, setWidth] = useState(0);

  const traceX = LABEL_WIDTH;
  const traceWidth = Math.max(0, width - LABEL_WIDTH - READOUT_WIDTH);

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.axis}>
        <Text style={styles.axisLabel}>last {HISTORY_SECONDS}s</Text>
        <Text style={styles.axisLabel}>now</Text>
      </View>

      <ScrollView contentContainerStyle={{ height: order.length * ROW_HEIGHT }}>
        {/* One canvas for every trace. A canvas per row would mean one native
            surface per device, which is what kills this kind of list. */}
        {width > 0 && (
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            {order.map((id, index) => (
              <SignalTrace
                key={id}
                id={id}
                x={traceX}
                y={index * ROW_HEIGHT + TRACE_INSET_Y}
                width={traceWidth}
                height={ROW_HEIGHT - TRACE_INSET_Y * 2}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 },
  axisLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 1 },
  row: { height: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  stale: { opacity: 0.4 },
  pressed: { backgroundColor: colors.surface },
  labelCell: { width: LABEL_WIDTH, paddingRight: 8, gap: 2 },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  suffix: { color: colors.textTertiary, fontSize: 11, fontFamily: mono },
  spacer: { flex: 1 },
  readout: {
    width: READOUT_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dbm: { fontSize: 16, fontFamily: mono, fontWeight: '700' },
  trend: { fontSize: 13, width: 14, textAlign: 'center' },
});
