import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useBle } from '@/ble/ble-provider';
import { HISTORY_HZ, HISTORY_SECONDS, realNameOf, useDeviceStore } from '@/store/devices';
import { findCalibration, useCalibrationsStore } from '@/store/calibrations';
import {
  CALIBRATION_SECONDS,
  DISTANCE_EDGES,
  FAR_LIMIT_METRES,
  calibrationOf,
  distanceBucket,
  distanceRange,
  estimateSignal,
  formatApprox,
  formatRange,
  implausibleAt1m,
  measureAt1m,
  type CalibrationSource,
  type SignalEstimate,
} from '@/ble/distance';
import type { Term } from '@/components/detail/glossary';
import { InfoButton, InfoSheet } from '@/components/detail/info-sheet';
import { trendOf, type Band, type Trend } from '@/ble/signal';
import { decimal, getT, labelOf, useLanguage, useT } from '@/i18n';
import { EmptyState } from '@/components/empty-state';
import { GateNotice } from '@/components/gate-notice';
import { CalibrateSheet, type CalibrationDraft } from '@/components/calibrate-sheet';
import { HuntRings } from '@/components/hunt-rings';
import { KindIcon } from '@/components/kind-icon';
import type { DeviceKind } from '@/ble/kind';
import { Screen } from '@/components/screen';
import { ScreenTitle } from '@/components/screen-title';
import { SignalTrace } from '@/components/signal-trace';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/**
 * The rings take what the readout and the panel leave, never more: the
 * reading is the main event, the rings support it. Bounded both ways, so a
 * tall phone does not grow them into the whole screen and a short one still
 * shows them legibly.
 */
const RINGS_MAX = 200;
const RINGS_MIN = 140;
/** Gap between the rings and the readout, matching `hero.gap`. */
const HERO_GAP = 12;
const TRACE_HEIGHT = 56;
/** Screen gutter on each side, from <Screen>. */
const GUTTER = 16;

/** Colour per distance bucket, nearest first, from the existing band ramp. */
const BUCKET_BAND: Band[] = ['immediate', 'immediate', 'near', 'far', 'distant'];

/** The trend compares the last few seconds with the few before, not the whole 20 s trace. */
const TREND_SAMPLES = 6 * HISTORY_HZ;

/**
 * The shown estimate moves only when the signal moves by this much, or the
 * range digits would tick on every packet. The rings still animate between.
 */
const DISPLAY_STEP_DB = 1;

function trendColour(trend: Trend, t: Palette): string {
  if (trend === 'approaching') return t.bands.immediate;
  if (trend === 'receding') return t.warning;
  return t.textSecondary;
}

type Reading = {
  label: string;
  kind: DeviceKind | null;
  dbm: number;
  /** Index into the doubling buckets, 0 nearest. Drives colour and haptics. */
  bucket: number;
  /** The approximate distance, rounded for display, without the unit. */
  approx: string;
  /** The likely range, already rounded for display, without the unit. */
  range: string;
  low: number;
  high: number;
  metres: number;
  calibration: CalibrationSource;
  /** The RSSI at 1 m the estimate uses, whatever its source. */
  rssiAt1m: number;
  trend: Trend;
  best: number | null;
  bestAgo: number | null;
  gone: boolean;
};

function read(
  id: string,
  previousBucket: number | null,
  shown: SignalEstimate | null
): { reading: Reading; estimate: SignalEstimate | null } {
  const record = useDeviceStore.getState().devices[id];
  if (!record) {
    return { reading: lost(), estimate: null };
  }
  const saved = findCalibration(useCalibrationsStore.getState().calibrations, {
    id,
    name: realNameOf(record),
  });
  const calibration = calibrationOf(record, saved?.rssiAt1m ?? null);
  const history = record.history;
  let bestIndex = 0;
  for (let i = 1; i < history.length; i += 1) if (history[i] > history[bestIndex]) bestIndex = i;

  const fresh = estimateSignal(record.recent, Date.now()) ?? {
    rssi: record.smoothed,
    noiseDb: 4,
    count: 0,
  };
  const estimate =
    shown &&
    Math.abs(fresh.rssi - shown.rssi) < DISPLAY_STEP_DB &&
    Math.abs(fresh.noiseDb - shown.noiseDb) < DISPLAY_STEP_DB / 2
      ? shown
      : fresh;
  const range = distanceRange(estimate, calibration);

  return {
    estimate,
    reading: {
      label: record.identity.label,
      kind: record.identity.kind?.kind ?? null,
      dbm: Math.round(estimate.rssi),
      bucket: distanceBucket(estimate.rssi, calibration, previousBucket),
      approx: formatApprox(range.metres),
      range: formatRange(range),
      low: range.low,
      high: Math.min(range.high, FAR_LIMIT_METRES),
      metres: Math.min(range.metres, FAR_LIMIT_METRES),
      calibration: calibration.source,
      rssiAt1m: calibration.rssiAt1m,
      trend: trendOf(history.slice(-TREND_SAMPLES)),
      best: history.length ? Math.round(history[bestIndex]) : null,
      bestAgo: history.length ? Math.round((history.length - 1 - bestIndex) / HISTORY_HZ) : null,
      gone: false,
    },
  };
}

function lost(): Reading {
  return {
    label: '',
    kind: null,
    dbm: -127,
    bucket: DISTANCE_EDGES.length,
    approx: '',
    range: '',
    low: FAR_LIMIT_METRES,
    high: FAR_LIMIT_METRES,
    metres: FAR_LIMIT_METRES,
    calibration: 'default',
    rssiAt1m: 0,
    trend: 'steady',
    best: null,
    bestAgo: null,
    gone: true,
  };
}

/**
 * What the calibration sheet confirms: the last few seconds of signal, to be
 * saved as this device's strength at 1 m. It asks first and states the
 * figure, so a tap made from the wrong spot costs nothing.
 */
function draftCalibration(id: string): CalibrationDraft | null {
  const record = useDeviceStore.getState().devices[id];
  if (!record) return null;
  const name = realNameOf(record);
  const existing = findCalibration(useCalibrationsStore.getState().calibrations, { id, name });
  const measured = measureAt1m(record.recent, record.firstSeen, Date.now());
  const t = getT();
  const copy = t.hunt.calibrateSheet;

  const plausibility = measured === null ? null : implausibleAt1m(measured);
  const warnings = [
    plausibility === 'too-strong' ? copy.tooStrong : null,
    plausibility === 'too-weak' ? copy.tooWeak : null,
    name ? null : copy.rotating,
  ].filter((w): w is string => w !== null);

  return {
    label: labelOf(record.identity.label, t),
    measured,
    seconds: CALIBRATION_SECONDS,
    warnings,
    existing: existing?.rssiAt1m ?? null,
  };
}

function saveCalibration(id: string, rssiAt1m: number) {
  const record = useDeviceStore.getState().devices[id];
  if (!record) return;
  useCalibrationsStore.getState().save({ id, name: realNameOf(record), rssiAt1m });
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

function removeCalibration(id: string) {
  const record = useDeviceStore.getState().devices[id];
  const { calibrations, remove } = useCalibrationsStore.getState();
  const existing = findCalibration(calibrations, { id, name: record ? realNameOf(record) : null });
  if (existing) remove(existing.id);
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
  const t = useT();
  return (
    <Screen>
      <ScreenTitle title={t.hunt.title} />
      <EmptyState
        art="searching"
        eyebrow={t.hunt.empty.eyebrow}
        title={t.hunt.empty.title}
        hint={t.hunt.empty.hint}
        action={{ label: t.hunt.empty.action, onPress: () => router.navigate('/') }}
      />
    </Screen>
  );
}

/** Switching target goes through Nearby, the same way a target is chosen. */
function Hunting({ id }: { id: string }) {
  const theme = useTheme();
  const t = useT();
  const language = useLanguage();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const [heroHeight, setHeroHeight] = useState(0);
  const [readoutHeight, setReadoutHeight] = useState(0);
  const fits = heroHeight > 0 ? heroHeight - readoutHeight - HERO_GAP : RINGS_MAX;
  const ringsSize = Math.max(RINGS_MIN, Math.min(RINGS_MAX, width - GUTTER * 2, fits));
  const [reading, setReading] = useState(() => read(id, null, null).reading);
  const lastBucket = useRef<number | null>(null);
  const shown = useRef<SignalEstimate | null>(null);

  const [term, setTerm] = useState<Term | null>(null);
  const [draft, setDraft] = useState<CalibrationDraft | null>(null);
  /**
   * The walking hint is for the first moments of a hunt. Once the reading has
   * changed bucket the user has seen it respond to walking, and the hint only
   * competes with the tiles; the ⓘ sheet keeps the same advice.
   */
  const [moved, setMoved] = useState(false);
  const [traceWidth, setTraceWidth] = useState(0);

  useEffect(() => {
    lastBucket.current = null;
    shown.current = null;
    setMoved(false);
    setReading(read(id, null, null).reading);

    const update = () => {
      const { reading: next, estimate } = read(id, lastBucket.current, shown.current);
      shown.current = estimate;
      setReading((previous) =>
        previous.dbm === next.dbm &&
        previous.label === next.label &&
        previous.kind === next.kind &&
        previous.bucket === next.bucket &&
        previous.approx === next.approx &&
        previous.range === next.range &&
        previous.metres === next.metres &&
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
          setMoved(true);
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
  const approx = decimal(reading.approx, language);
  const range = decimal(reading.range, language);

  return (
    <Screen>
      <ScreenTitle
        title={reading.label ? labelOf(reading.label, t) : t.common.device}
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
          eyebrow={t.hunt.lost.eyebrow}
          title={t.hunt.lost.title}
          hint={t.hunt.lost.hint}
        />
      ) : (
        <>
          {/* The hero: what you glance at while walking. Takes the free height. */}
          <View
            style={styles.hero}
            onLayout={(e) => setHeroHeight(Math.floor(e.nativeEvent.layout.height))}>
            <HuntRings
              size={ringsSize}
              bucket={reading.bucket}
              low={reading.low}
              high={reading.high}
              metres={reading.metres}
              colour={bucketColour}
            />
            <View
              style={styles.readout}
              onLayout={(e) => setReadoutHeight(Math.ceil(e.nativeEvent.layout.height))}>
              {/* One figure to walk by, marked as approximate twice: the ≈ and the
                  line under it with the range it could really be. */}
              <Text
                style={[styles.distance, { color: bucketColour }]}
                accessibilityLabel={t.hunt.a11yDistance(approx, range)}>
                {reading.approx.startsWith('<') ? null : <Text style={styles.approx}>≈ </Text>}
                {approx}
                <Text style={styles.unit}> m</Text>
              </Text>
              <Text style={styles.likely}>
                {t.hunt.likely(range)}
              </Text>
              <View style={[styles.trendPill, { borderColor: trendColour(reading.trend, theme) }]}>
                <Text style={[styles.trend, { color: trendColour(reading.trend, theme) }]}>
                  {t.hunt.trend[reading.trend]}
                </Text>
              </View>
            </View>
          </View>

          {/* The detail: read when standing still. Anchored to the bottom. */}
          <View style={styles.panel}>
            <View style={styles.signal}>
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>{t.hunt.signalLabel(HISTORY_SECONDS)}</Text>
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
                  {reading.bestAgo === null ? t.hunt.strongest : t.hunt.strongestAgo(reading.bestAgo)}
                </Text>
              </View>

              <View style={styles.tile}>
                <View style={styles.tileHead}>
                  <Text style={styles.tileValue} numberOfLines={1}>
                    {t.hunt.calibration[reading.calibration]}
                  </Text>
                  <InfoButton term="distance" onInfo={setTerm} />
                </View>
                <View style={styles.tileFoot}>
                  <Pressable
                    onPress={() => setDraft(draftCalibration(id))}
                    hitSlop={12}
                    accessibilityRole="button">
                    <Text style={styles.calibrate}>
                      {reading.calibration === 'user' ? t.hunt.recalibrate : t.hunt.calibrate}
                    </Text>
                  </Pressable>
                  {/* Only a figure the user measured; an assumed one would read as measured. */}
                  {reading.calibration === 'user' ? (
                    <Text
                      style={styles.tileCaption}
                      accessibilityLabel={t.hunt.a11yAt1m(reading.rssiAt1m)}>
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
      <CalibrateSheet
        draft={draft}
        onClose={() => setDraft(null)}
        onSave={() => {
          if (draft?.measured != null) saveCalibration(id, draft.measured);
          setDraft(null);
        }}
        onRemove={() => {
          removeCalibration(id);
          setDraft(null);
        }}
      />

      {moved ? null : (
        <Text style={styles.hint}>{t.hunt.hint}</Text>
      )}
    </Screen>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: HERO_GAP },
    readout: { alignItems: 'center', gap: 4 },
    distance: {
      fontSize: 56,
      fontWeight: '800',
      lineHeight: 62,
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    },
    unit: { fontSize: 24, fontWeight: '600', letterSpacing: 0 },
    approx: { fontSize: 36, fontWeight: '600', letterSpacing: 0 },
    likely: { color: t.textSecondary, fontSize: 13, fontVariant: ['tabular-nums'] },
    trendPill: {
      marginTop: 6,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    trend: { fontSize: 13, fontWeight: '700', letterSpacing: 2 },

    // Clear of the tab bar once the walking hint below has gone.
    panel: { gap: 8, paddingBottom: 12 },
    // Bare, no card, the same as the detail screen's trace: it is a supporting
    // line, not a panel of its own.
    signal: { gap: 6, paddingHorizontal: 2, paddingBottom: 4 },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
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
    tileHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
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
