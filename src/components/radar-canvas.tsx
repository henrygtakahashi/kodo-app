import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import type { SkSize } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BAND_RADII } from '@/ble/signal';
import { useDeviceStore } from '@/store/devices';
import { bands, colors } from '@/theme/colors';
import { RadarBlip } from './radar-blip';

const RIM_PADDING = 28;
const PULSE_COUNT = 3;
const PULSE_PERIOD_MS = 3600;

/**
 * Range rings at the band boundaries. Static: they are a scale, not motion.
 */
function Rings({ size }: { size: SharedValue<SkSize> }) {
  return (
    <Group>
      {BAND_RADII.map(({ band, radius }) => (
        <Ring key={band} size={size} fraction={radius} />
      ))}
    </Group>
  );
}

function Ring({ size, fraction }: { size: SharedValue<SkSize>; fraction: number }) {
  const cx = useDerivedValue(() => size.value.width / 2);
  const cy = useDerivedValue(() => size.value.height / 2);
  const r = useDerivedValue(
    () =>
      Math.max(0, Math.min(size.value.width, size.value.height) / 2 - RIM_PADDING) * fraction
  );
  return <Circle cx={cx} cy={cy} r={r} color={colors.border} style="stroke" strokeWidth={1} />;
}

/**
 * Concentric pulses expanding outward — never a rotating sweep.
 *
 * A sweep line implies the hardware samples by direction. It does not: BLE
 * gives distance only. Pulses read as range, which is what is actually
 * measured (DESIGN.md §4).
 */
function Pulses({ size }: { size: SharedValue<SkSize> }) {
  const t = useSharedValue(0);

  useEffect(() => {
    // Constant motion: linear, or the ring visibly speeds up and slows down.
    t.set(withRepeat(withTiming(1, { duration: PULSE_PERIOD_MS, easing: Easing.linear }), -1, false));
  }, [t]);

  return (
    <Group>
      {Array.from({ length: PULSE_COUNT }, (_, index) => (
        <Pulse key={index} size={size} t={t} phase={index / PULSE_COUNT} />
      ))}
    </Group>
  );
}

function Pulse({
  size,
  t,
  phase,
}: {
  size: SharedValue<SkSize>;
  t: SharedValue<number>;
  phase: number;
}) {
  const progress = useDerivedValue(() => (t.value + phase) % 1);
  const cx = useDerivedValue(() => size.value.width / 2);
  const cy = useDerivedValue(() => size.value.height / 2);
  const r = useDerivedValue(
    () =>
      Math.max(0, Math.min(size.value.width, size.value.height) / 2 - RIM_PADDING) *
      progress.value
  );
  // Fade as it travels, so the rim does not flash.
  const opacity = useDerivedValue(() => 0.35 * (1 - progress.value) ** 1.5);

  return (
    <Circle
      cx={cx}
      cy={cy}
      r={r}
      color={bands.immediate}
      opacity={opacity}
      style="stroke"
      strokeWidth={1.5}
    />
  );
}

export function RadarCanvas() {
  // onSize writes straight into a shared value — canvas size never becomes
  // React state, so a rotation or layout change costs no re-render.
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });

  /**
   * Label geometry needs the box in JS, and percentages cannot express it: the
   * scene's radius is min(width, height)/2 minus the rim padding, so a
   * percentage of a non-square container puts the labels off the rings. The
   * container is forced square and measured once — layout changes are rare, so
   * this costs a render on rotation, not per frame.
   */
  const [box, setBox] = useState(0);

  // The id array only. An RSSI change cannot re-render this; each blip reads
  // its own value (DESIGN.md §2).
  const order = useDeviceStore((state) => state.order);

  return (
    <View style={styles.centre}>
      <View
        style={styles.square}
        onLayout={(event) => setBox(event.nativeEvent.layout.width)}>
        <Canvas style={StyleSheet.absoluteFill} onSize={size}>
          <Rings size={size} />
          <Pulses size={size} />
          {order.map((id) => (
            <RadarBlip key={id} id={id} size={size} />
          ))}
        </Canvas>

        {/* Labels live outside the canvas: Skia text needs a loaded font, and
            these are static chrome rather than part of the scene. */}
        {box > 0 &&
          BAND_RADII.map(({ band, radius }) => (
            <Text
              key={band}
              style={[
                styles.bandLabel,
                { top: box / 2 - radius * (box / 2 - RIM_PADDING) - 6 },
              ]}>
              {band}
            </Text>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, justifyContent: 'center' },
  square: { width: '100%', aspectRatio: 1, alignSelf: 'center' },
  bandLabel: {
    position: 'absolute',
    alignSelf: 'center',
    color: colors.textTertiary,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
