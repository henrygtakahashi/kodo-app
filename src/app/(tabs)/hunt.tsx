import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useBle } from '@/ble/ble-provider';
import { HISTORY_HZ, HISTORY_SECONDS, useDeviceStore } from '@/store/devices';
import { bandFor, trendOf, type Band, type Trend } from '@/ble/signal';
import { GateNotice } from '@/components/gate-notice';
import { HuntGauge } from '@/components/hunt-gauge';
import { Screen } from '@/components/screen';
import { SignalTrace } from '@/components/signal-trace';
import { bands, colors, mono } from '@/theme/colors';

const GAUGE = 240;
const TRACE_HEIGHT = 56;

const TREND_COPY: Record<Trend, string> = {
  approaching: '▲  WARMER',
  receding: '▼  COLDER',
  steady: '·  HOLDING',
};

function trendColour(trend: Trend): string {
  if (trend === 'approaching') return bands.immediate;
  if (trend === 'receding') return colors.warning;
  return colors.textSecondary;
}

type Reading = {
  label: string;
  dbm: number;
  band: Band;
  trend: Trend;
  best: number | null;
  bestAgo: number | null;
  gone: boolean;
};

function read(id: string): Reading {
  const record = useDeviceStore.getState().devices[id];
  if (!record) {
    return { label: '', dbm: -127, band: 'distant', trend: 'steady', best: null, bestAgo: null, gone: true };
  }
  const history = record.history;
  let bestIndex = 0;
  for (let i = 1; i < history.length; i += 1) if (history[i] > history[bestIndex]) bestIndex = i;

  return {
    label: record.identity.label,
    dbm: Math.round(record.smoothed),
    band: bandFor(record.smoothed),
    trend: trendOf(history),
    best: history.length ? Math.round(history[bestIndex]) : null,
    bestAgo: history.length ? Math.round((history.length - 1 - bestIndex) / HISTORY_HZ) : null,
    gone: false,
  };
}

export default function HuntScreen() {
  const { gate } = useBle();
  const targetId = useDeviceStore((state) => state.targetId);
  const setTarget = useDeviceStore((state) => state.setTarget);

  if (gate.status !== 'ready') return <GateNotice gate={gate} />;
  if (!targetId) return <Empty />;
  return <Hunting id={targetId} onClear={() => setTarget(null)} />;
}

/**
 * Deliberately not a device picker. A list here would just be the Scanner
 * again, which is the duplication this screen exists to avoid.
 */
function Empty() {
  return (
    <Screen>
      <Text style={styles.title}>Hunt</Text>
      <View style={styles.emptyBody}>
        <Text style={styles.emptyLead}>No target.</Text>
        <Text style={styles.emptyHint}>
          Open a device in Scanner and choose “Hunt this device”.
        </Text>
      </View>
    </Screen>
  );
}

function Hunting({ id, onClear }: { id: string; onClear: () => void }) {
  const [reading, setReading] = useState(() => read(id));
  const lastBand = useRef<Band | null>(null);

  useEffect(() => {
    lastBand.current = null;
    setReading(read(id));

    return useDeviceStore.subscribe(() => {
      const next = read(id);
      setReading((previous) =>
        previous.dbm === next.dbm &&
        previous.trend === next.trend &&
        previous.gone === next.gone &&
        previous.best === next.best
          ? previous
          : next
      );

      // One haptic per band crossing, never per frame. Arriving at the closest
      // band is the moment worth a distinct, stronger cue.
      if (!next.gone && next.band !== lastBand.current) {
        if (lastBand.current !== null) {
          if (next.band === 'immediate') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        lastBand.current = next.band;
      }
    });
  }, [id]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {reading.label || 'Device'}
        </Text>
        <Pressable onPress={onClear} hitSlop={10} accessibilityRole="button">
          <Text style={styles.change}>change</Text>
        </Pressable>
      </View>

      {reading.gone ? (
        <View style={styles.emptyBody}>
          <Text style={styles.emptyLead}>Lost</Text>
          <Text style={styles.emptyHint}>
            This device stopped advertising. Walk back toward where it was last strong.
          </Text>
        </View>
      ) : (
        <View style={styles.instrument}>
          <View style={styles.gaugeWrap}>
            <HuntGauge id={id} size={GAUGE} />
            <View style={styles.gaugeCentre} pointerEvents="none">
              <Text style={[styles.dbm, { color: bands[reading.band] }]}>{reading.dbm}</Text>
              <Text style={styles.unit}>dBm</Text>
              <Text style={[styles.band, { color: bands[reading.band] }]}>{reading.band}</Text>
            </View>
          </View>

          <Text style={[styles.trend, { color: trendColour(reading.trend) }]}>
            {TREND_COPY[reading.trend]}
          </Text>

          {reading.best !== null && reading.bestAgo !== null ? (
            <Text style={styles.best}>
              strongest {reading.best} dBm · {reading.bestAgo}s ago
            </Text>
          ) : null}

          <View style={styles.traceWrap}>
            <Canvas style={StyleSheet.absoluteFill}>
              <SignalTrace id={id} x={0} y={6} width={320} height={TRACE_HEIGHT - 12} />
            </Canvas>
          </View>
          <Text style={styles.traceLabel}>last {HISTORY_SECONDS}s</Text>
        </View>
      )}

      <Text style={styles.hint}>
        Signal only — no direction. Walk, and follow the number up.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', flex: 1 },
  change: { color: colors.signal, fontSize: 14, fontWeight: '600' },

  instrument: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  gaugeWrap: { width: GAUGE, height: GAUGE, alignItems: 'center', justifyContent: 'center' },
  gaugeCentre: { position: 'absolute', alignItems: 'center' },
  dbm: { fontSize: 64, fontFamily: mono, fontWeight: '700', lineHeight: 70 },
  unit: { color: colors.textTertiary, fontSize: 12, fontFamily: mono, marginTop: -4 },
  band: { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginTop: 10 },

  trend: { fontSize: 18, fontWeight: '700', letterSpacing: 2, marginTop: 8 },
  best: { color: colors.textTertiary, fontSize: 12, fontFamily: mono },

  traceWrap: { width: 320, height: TRACE_HEIGHT, marginTop: 8 },
  traceLabel: { color: colors.textTertiary, fontSize: 10, letterSpacing: 1 },

  emptyBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyLead: { color: colors.textPrimary, fontSize: 20, fontWeight: '600' },
  emptyHint: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },

  hint: {
    color: colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
