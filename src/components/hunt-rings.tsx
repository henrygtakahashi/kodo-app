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

import { DISTANCE_EDGES } from '@/ble/distance';
import { useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/** The scale runs 0.5 m to 16 m on a log2 axis, so every ring is one doubling. */
const MIN_LOG = -1;
const MAX_LOG = 4;

/** Closer pulses faster, like a sonar return. One period per bucket, nearest first. */
const PULSE_MS = [650, 900, 1250, 1700, 2300];

const SETTLE_MS = 420;

function radiusOf(metres: number, rim: number): number {
  return (rim * (Math.log2(metres) - MIN_LOG)) / (MAX_LOG - MIN_LOG);
}

/**
 * Range rings centred on the target, with the estimated bucket lit.
 *
 * Rings are symmetric, so this draws distance and nothing else: there is no
 * blip, no bearing, no position. The lit band is the whole bucket rather than a
 * line at the point estimate, because a bucket is all the estimate supports.
 */
export function HuntRings({
  size,
  bucket,
  colour,
}: {
  size: number;
  bucket: number;
  colour: string;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reduceMotion = useReducedMotion();

  const centre = size / 2;
  const rim = centre - 2;
  const edgeRadii = DISTANCE_EDGES.map((metres) => radiusOf(metres, rim));

  const inner = useSharedValue(0);
  const outer = useSharedValue(rim);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const radii = DISTANCE_EDGES.map((metres) => radiusOf(metres, rim));
    const config = { duration: reduceMotion ? 0 : SETTLE_MS, easing: Easing.out(Easing.cubic) };
    inner.set(withTiming(bucket === 0 ? 0 : radii[bucket - 1], config));
    outer.set(withTiming(bucket >= radii.length ? rim : radii[bucket], config));
  }, [bucket, rim, reduceMotion, inner, outer]);

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
  const pulseRadius = useDerivedValue(() => pulse.value * outer.value);
  const pulseOpacity = useDerivedValue(() => (reduceMotion ? 0 : 0.9 * (1 - pulse.value)));

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle
          cx={centre}
          cy={centre}
          r={bandRadius}
          color={colour}
          opacity={0.2}
          style="stroke"
          strokeWidth={bandWidth}
        />
        <Circle cx={centre} cy={centre} r={outer} color={colour} style="stroke" strokeWidth={2} />

        {edgeRadii.map((r) => (
          <Circle
            key={r}
            cx={centre}
            cy={centre}
            r={r}
            color={theme.textTertiary}
            style="stroke"
            strokeWidth={1}
          />
        ))}
        <Circle cx={centre} cy={centre} r={rim} color={theme.border} style="stroke" strokeWidth={1} />

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
          <Circle cx={centre} cy={centre} r={12} color={colour} opacity={0.5}>
            <BlurMask blur={8} style="normal" />
          </Circle>
          <Circle cx={centre} cy={centre} r={5} color={colour} />
        </Group>
      </Canvas>

      {DISTANCE_EDGES.map((metres, i) => (
        <Text key={metres} style={[styles.ringLabel, { top: centre - edgeRadii[i] + 3 }]}>
          {metres} m
        </Text>
      ))}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    // Just inside the top of its ring, where it never meets the lit band's edge stroke.
    ringLabel: {
      position: 'absolute',
      alignSelf: 'center',
      color: t.textTertiary,
      fontSize: 10,
      lineHeight: 14,
      fontFamily: 'monospace',
      paddingHorizontal: 4,
    },
  });
