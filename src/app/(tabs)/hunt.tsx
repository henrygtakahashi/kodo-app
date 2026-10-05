import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@shopify/react-native-skia';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useBle } from '@/ble/ble-provider';
import { HISTORY_HZ, HISTORY_SECONDS, realNameOf, useDeviceStore } from '@/store/devices';
import { findCalibration, useCalibrationsStore } from '@/store/calibrations';
import {
  CALIBRATION_SECONDS,
  DISTANCE_LABELS,
  calibrationOf,
  distanceBucket,
  implausibleAt1m,
  measureAt1m,
  steadyRssi,
  type CalibrationSource,
} from '@/ble/distance';
import type { Term } from '@/components/detail/glossary';
import { InfoButton, InfoSheet } from '@/components/detail/info-sheet';
import { trendOf, type Band, type Trend } from '@/ble/signal';
import { EmptyState } from '@/components/empty-state';
import { GateNotice } from '@/components/gate-notice';
import { HuntRings } from '@/components/hunt-rings';
import { KindIcon } from '@/components/kind-icon';
import type { DeviceKind } from '@/ble/kind';
import { Screen } from '@/components/screen';
import { ScreenTitle } from '@/components/screen-title';
import { SignalTrace } from '@/components/signal-trace';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/** Compact on purpose: the range reading below is the main event, the rings support it. */
const RINGS_MAX = 220;
const TRACE_HEIGHT = 40;
/** Screen gutter on each side, from <Screen>. */
const GUTTER = 16;

/** Colour per distance bucket, nearest first, from the existing band ramp. */
const BUCKET_BAND: Band[] = ['immediate', 'immediate', 'near', 'far', 'distant'];

const CALIBRATION_COPY: Record<CalibrationSource, string> = {
  user: 'Calibrated',
  ibeacon: 'Beacon',
  'tx-power': 'Tx power',
  default: 'Uncalibrated',
};

const TREND_COPY: Record<Trend, string> = {
  approaching: '▲  WARMER',
  receding: '▼  COLDER',
  steady: '·  HOLDING',
};

function trendColour(trend: Trend, t: Palette): string {
  if (trend === 'approaching') return t.bands.immediate;
  if (trend === 'receding') return t.warning;
  return t.textSecondary;
}

type Reading = {
  label: string;
  kind: DeviceKind | null;
  dbm: number;
  /** Index into DISTANCE_LABELS, 0 nearest. */
  bucket: number;
  calibration: CalibrationSource;
  /** The RSSI at 1 m the estimate uses, whatever its source. */
  rssiAt1m: number;
  trend: Trend;
  best: number | null;
  bestAgo: number | null;
  gone: boolean;
};

function read(id: string, previousBucket: number | null): Reading {
  const record = useDeviceStore.getState().devices[id];
  if (!record) {
    return {
      label: '',
      kind: null,
      dbm: -127,
      bucket: DISTANCE_LABELS.length - 1,
      calibration: 'default',
      rssiAt1m: 0,
      trend: 'steady',
      best: null,
      bestAgo: null,
      gone: true,
    };
  }
  const saved = findCalibration(useCalibrationsStore.getState().calibrations, {
    id,
    name: realNameOf(record),
  });
  const calibration = calibrationOf(record, saved?.rssiAt1m ?? null);
  const history = record.history;
  let bestIndex = 0;
  for (let i = 1; i < history.length; i += 1) if (history[i] > history[bestIndex]) bestIndex = i;

  return {
    label: record.identity.label,
    kind: record.identity.kind?.kind ?? null,
    dbm: Math.round(record.smoothed),
    bucket: distanceBucket(
      steadyRssi(history, HISTORY_HZ, record.smoothed),
      calibration,
      previousBucket
    ),
    calibration: calibration.source,
    rssiAt1m: calibration.rssiAt1m,
    trend: trendOf(history),
    best: history.length ? Math.round(history[bestIndex]) : null,
    bestAgo: history.length ? Math.round((history.length - 1 - bestIndex) / HISTORY_HZ) : null,
    gone: false,
  };
}

/**
 * Saves the last few seconds of signal as this device's strength at 1 m. It
 * asks first and states the figure, so a tap made from the wrong spot costs
 * nothing.
 */
function calibrate(id: string) {
  const record = useDeviceStore.getState().devices[id];
  if (!record) return;
  const name = realNameOf(record);
  const { calibrations, save, remove } = useCalibrationsStore.getState();
  const existing = findCalibration(calibrations, { id, name });
  const measured = measureAt1m(record.history, HISTORY_HZ);

  if (measured === null) {
    Alert.alert(
      'Not enough signal yet',
      `Keep the phone 1 m from the device for ${CALIBRATION_SECONDS} seconds, then try again.`
    );
    return;
  }

  const forget = existing
    ? [
        {
          text: 'Remove calibration',
          style: 'destructive' as const,
          onPress: () => remove(existing.id),
        },
      ]
    : [];
  const plausibility = implausibleAt1m(measured);
  const odd =
    plausibility === 'too-strong'
      ? '\n\nThat is stronger than most devices read at 1 m. If the phone was closer, every distance will read too far.'
      : plausibility === 'too-weak'
        ? '\n\nThat is weaker than most devices read at 1 m. If something was in the way, every distance will read too close.'
        : '';
  const rotating = name
    ? ''
    : '\n\nThis device broadcasts no name. If it changes its address, the calibration is lost.';

  Alert.alert(
    'Calibrate at 1 m',
    `Is the phone 1 m from ${record.identity.label}, and has it been for the last ${CALIBRATION_SECONDS} seconds?\n\nThe signal there was ${measured} dBm. It becomes this device's strength at 1 m.${odd}${rotating}`,
    [
      ...forget,
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: () => {
          save({ id, name, rssiAt1m: measured });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]
  );
}

export default function HuntScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { gate } = useBle();
  const targetId = useDeviceStore((state) => state.targetId);

  if (gate.status !== 'ready') return <GateNotice gate={gate} />;
  if (!targetId) return <Empty />;
  return <Hunting id={targetId} />;
}

/**
 * Deliberately not a device picker. A list here would just be the Scanner
 * again, which is the duplication this screen exists to avoid.
 */
function Empty() {
  return (
    <Screen>
      <ScreenTitle title="Hunt" />
      <EmptyState
        art="searching"
        eyebrow="no target"
        title="Pick something to hunt"
        hint="Open a device in Nearby and choose “Hunt this device”."
        action={{ label: 'Browse Nearby', onPress: () => router.navigate('/') }}
      />
    </Screen>
  );
}

/** Switching target goes through Nearby, the same way a target is chosen. */
function Hunting({ id }: { id: string }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const ringsSize = Math.min(RINGS_MAX, width - GUTTER * 2);
  const [reading, setReading] = useState(() => read(id, null));
  const lastBucket = useRef<number | null>(null);

  const [term, setTerm] = useState<Term | null>(null);
  const [traceWidth, setTraceWidth] = useState(0);

  useEffect(() => {
    lastBucket.current = null;
    setReading(read(id, null));

    const update = () => {
      const next = read(id, lastBucket.current);
      setReading((previous) =>
        previous.dbm === next.dbm &&
        previous.label === next.label &&
        previous.kind === next.kind &&
        previous.bucket === next.bucket &&
        previous.calibration === next.calibration &&
        previous.rssiAt1m === next.rssiAt1m &&
        previous.trend === next.trend &&
        previous.gone === next.gone &&
        previous.best === next.best
          ? previous
          : next
      );

      // One haptic per distance-bucket change, never per frame; the bucket's
      // hysteresis keeps an edge from buzzing. Arriving in the nearest bucket
      // is the moment worth a distinct, stronger cue.
      if (!next.gone && next.bucket !== lastBucket.current) {
        if (lastBucket.current !== null) {
          if (next.bucket === 0) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        lastBucket.current = next.bucket;
      }
    };

    const unsubscribeDevices = useDeviceStore.subscribe(update);
    // A new calibration moves the estimate at once, not on the next packet.
    const unsubscribeCalibrations = useCalibrationsStore.subscribe(update);
    return () => {
      unsubscribeDevices();
      unsubscribeCalibrations();
    };
  }, [id]);

  const bucketColour = theme.bands[BUCKET_BAND[reading.bucket]];

  return (
    <Screen>
      <ScreenTitle
        title={reading.label || 'Device'}
        // Same glyphs as Nearby and the detail screen, generic when the kind is unknown.
        leading={
          reading.kind ? (
            <KindIcon kind={reading.kind} size={24} color={theme.textSecondary} />
          ) : (
            <MaterialCommunityIcons name="bluetooth" size={24} color={theme.textSecondary} />
          )
        }
      />

      {reading.gone ? (
        <EmptyState
          art="lost"
          eyebrow="signal lost"
          title="Lost"
          hint="This device stopped advertising. Walk back toward where it was last strong."
        />
      ) : (
        <>
          {/* The hero: what you glance at while walking. Takes the free height. */}
          <View style={styles.hero}>
            <HuntRings size={ringsSize} bucket={reading.bucket} colour={bucketColour} />
            <View style={styles.readout}>
              <Text style={[styles.distance, { color: bucketColour }]}>
                {DISTANCE_LABELS[reading.bucket]}
              </Text>
              <Text style={[styles.trend, { color: trendColour(reading.trend, theme) }]}>
                {TREND_COPY[reading.trend]}
              </Text>
            </View>
          </View>

          {/* The detail: read when standing still. Anchored to the bottom. */}
          <View style={styles.panel}>
            <View style={styles.signal}>
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>signal · last {HISTORY_SECONDS} s</Text>
                <Text style={[styles.cardValue, { color: bucketColour }]}>{reading.dbm} dBm</Text>
              </View>
              <View
                style={styles.traceWrap}
                onLayout={(e) => setTraceWidth(e.nativeEvent.layout.width)}>
                {traceWidth > 0 && (
                  <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
                    <SignalTrace id={id} x={0} y={2} width={traceWidth} height={TRACE_HEIGHT - 4} />
                  </Canvas>
                )}
              </View>
            </View>

            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>
                  {reading.best === null ? '—' : `${reading.best} dBm`}
                </Text>
                <Text style={styles.tileCaption}>
                  {reading.bestAgo === null ? 'strongest' : `strongest · ${reading.bestAgo} s ago`}
                </Text>
              </View>

              <View style={styles.tile}>
                <View style={styles.tileHead}>
                  <Text style={styles.tileValue} numberOfLines={1}>
                    {CALIBRATION_COPY[reading.calibration]}
                  </Text>
                  <InfoButton term="distance" onInfo={setTerm} />
                </View>
                <View style={styles.tileFoot}>
                  <Pressable onPress={() => calibrate(id)} hitSlop={12} accessibilityRole="button">
                    <Text style={styles.calibrate}>
                      {reading.calibration === 'user' ? 'Recalibrate' : 'Calibrate at 1 m'}
                    </Text>
                  </Pressable>
                  {/* Only a figure the user measured; an assumed one would read as measured. */}
                  {reading.calibration === 'user' ? (
                    <Text
                      style={styles.tileCaption}
                      accessibilityLabel={`${reading.rssiAt1m} dBm at 1 metre`}>
                      {reading.rssiAt1m} dBm
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </>
      )}

      <InfoSheet term={term} onClose={() => setTerm(null)} />

      <Text style={styles.hint}>
        No direction — walk, and watch the range shrink.
      </Text>
    </Screen>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  readout: { alignItems: 'center', gap: 4 },
  distance: { fontSize: 56, fontFamily: 'monospace', fontWeight: '700', lineHeight: 62 },
  trend: { fontSize: 18, fontWeight: '700', letterSpacing: 2 },

  panel: { gap: 8 },
  // Bare, no card: the trace is a supporting line, not a panel of its own.
  signal: { gap: 6, paddingHorizontal: 2, paddingBottom: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardLabel: { color: t.textTertiary, fontSize: 11 },
  cardValue: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  traceWrap: { height: TRACE_HEIGHT },

  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    backgroundColor: t.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    padding: 12,
    gap: 4,
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  tileValue: {
    color: t.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  tileCaption: { color: t.textSecondary, fontSize: 12 },
  tileFoot: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 6,
  },
  calibrate: { color: t.signal, fontSize: 13, fontWeight: '600' },

  hint: {
    color: t.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
