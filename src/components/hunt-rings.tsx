import { BlurMask, Canvas, Circle, Group } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { DISTANCE_EDGES, FAR_LIMIT_METRES } from '@/ble/distance';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/** The scale runs 0.5 m to 16 m on a log2 axis, so every ring is one doubling. */
const MIN_LOG = -1;
const MAX_LOG = Math.log2(FAR_LIMIT_METRES);

/** Closer pulses faster, like a sonar return. One period per bucket, nearest first. */
const PULSE_MS = [650, 900, 1250, 1700, 2300];

const SETTLE_MS = 420;

/** Fits two digits at 10 px; rings sit about 18 dp apart at the smallest size. */
const LABEL_WIDTH = 16;

/** The target dot's own radius: nothing is drawn inside it. */
const CORE = 10;

function radiusOf(metres: number, rim: number): number {
  const t = (Math.log2(Math.max(metres, 2 ** MIN_LOG)) - MIN_LOG) / (MAX_LOG - MIN_LOG);
  return CORE + (rim - CORE) * Math.min(1, t);
}

/**
 * Range rings centred on the target, with the likely range lit.
 *
 * Rings are symmetric, so this draws distance and nothing else: there is no
 * blip, no bearing, no position. The lit band spans the whole likely range, so
 * it is thin when the estimate is good and wide when it is not; a thin line
 * marks the middle of it.
 */
export function HuntRings({
  size,
  bucket,
  low,
  high,
  metres,
  colour,
}: {
  size: number;
  /** Paces the pulse: nearer is faster. */
  bucket: number;
  low: number;
  high: number;
  metres: number;
  colour: string;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reduceMotion = useReducedMotion();

  const centre = size / 2;
  const rim = centre - 2;
  const edgeRadii = DISTANCE_EDGES.map((metres) => radiusOf(metres, rim));

  const inner = useSharedValue(radiusOf(low, rim));
  const outer = useSharedValue(radiusOf(high, rim));
  const middle = useSharedValue(radiusOf(metres, rim));
  const pulse = useSharedValue(0);

  useEffect(() => {
    const config = {
      duration: reduceMotion ? 0 : SETTLE_MS,
      easing: Easing.out(Easing.cubic),
    };
    inner.set(withTiming(radiusOf(low, rim), config));
    outer.set(withTiming(radiusOf(high, rim), config));
    middle.set(withTiming(radiusOf(metres, rim), config));
  }, [low, high, metres, rim, reduceMotion, inner, outer, middle]);

  useEffect(() => {
    if (reduceMotion) {
      pulse.set(0);
      return;
    }
    pulse.set(0);
    pulse.set(
      withRepeat(
        withTiming(1, {
          duration: PULSE_MS[bucket] ?? PULSE_MS[PULSE_MS.length - 1],
          easing: Easing.out(Easing.quad),
        }),
        -1,
        false
      )
    );
    return () => cancelAnimation(pulse);
  }, [bucket, reduceMotion, pulse]);

  // The lit band is one thick stroke: radius at its middle, width its span.
  const bandRadius = useDerivedValue(() => (inner.value + outer.value) / 2);
  const bandWidth = useDerivedValue(() => Math.max(1, outer.value - inner.value));
  const pulseRadius = useDerivedValue(() => CORE + pulse.value * (middle.value - CORE));
  const pulseOpacity = useDerivedValue(() => (reduceMotion ? 0 : 0.9 * (1 - pulse.value)));

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        {edgeRadii.map((r) => (
          <Circle
            key={r}
            cx={centre}
            cy={centre}
            r={r}
            color={theme.border}
            style="stroke"
            strokeWidth={1}
          />
        ))}
        <Circle
          cx={centre}
          cy={centre}
          r={rim}
          color={theme.border}
          style="stroke"
          strokeWidth={1}
        />

        <Circle
          cx={centre}
          cy={centre}
          r={bandRadius}
          color={colour}
          opacity={0.22}
          style="stroke"
          strokeWidth={bandWidth}
        />
        <Circle
          cx={centre}
          cy={centre}
          r={middle}
          color={colour}
          style="stroke"
          strokeWidth={2.5}
        />

        <Circle
          cx={centre}
          cy={centre}
          r={pulseRadius}
          color={colour}
          opacity={pulseOpacity}
          style="stroke"
          strokeWidth={1.5}
        />

        {/* The target itself. */}
        <Group>
          <Circle cx={centre} cy={centre} r={CORE + 2} color={colour} opacity={0.45}>
            <BlurMask blur={8} style="normal" />
          </Circle>
          <Circle cx={centre} cy={centre} r={5} color={colour} />
        </Group>
      </Canvas>

      {DISTANCE_EDGES.map((metres, i) => (
        <Text
          key={metres}
          style={[
            styles.ringLabel,
            { left: centre + edgeRadii[i] - LABEL_WIDTH / 2, top: centre - 7 },
          ]}>
          {metres}
        </Text>
      ))}
      {/* The unit once, past the outermost labelled ring, instead of on every label. */}
      <Text
        style={[
          styles.ringLabel,
          styles.unitLabel,
          { left: centre + edgeRadii[edgeRadii.length - 1] + LABEL_WIDTH / 2, top: centre - 7 },
        ]}>
        m
      </Text>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    // On its ring where it crosses the horizontal axis, on a chip of
    // background so the ring stops short of the digits. Along the axis the
    // rings are a full spacing apart; at the top they stacked into a column.
    unitLabel: { width: undefined, backgroundColor: 'transparent' },
    ringLabel: {
      position: 'absolute',
      width: LABEL_WIDTH,
      textAlign: 'center',
      color: t.textTertiary,
      backgroundColor: t.bg,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
  });
