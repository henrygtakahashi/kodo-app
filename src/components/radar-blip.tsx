import { Circle, Group } from '@shopify/react-native-skia';
import type { SkSize } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import {
  Easing,
  interpolateColor,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { angleFor } from '@/ble/hash';
import { BAND_RADII, normalisedRadius } from '@/ble/signal';
import { useDeviceStore } from '@/store/devices';
import { bands } from '@/theme/colors';

/** Strong ease-out. Reanimated's built-ins are as weak as CSS's. */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const RIM_PADDING = 28;

const RADIUS_STOPS = BAND_RADII.map((b) => b.radius);
const BAND_COLOURS = [bands.immediate, bands.near, bands.far, bands.distant];

/**
 * One device. Its radius lives in a shared value written straight from a store
 * subscription — React never re-renders for an RSSI change, which is the
 * contract in DESIGN.md §2.
 *
 * Angle is a deterministic hash of the device id and never animates: it is
 * stable so the blip cannot jump, and it carries no spatial meaning. BLE gives
 * distance, not bearing.
 */
export function RadarBlip({ id, size }: { id: string; size: SharedValue<SkSize> }) {
  const radius = useSharedValue(1);
  const appear = useSharedValue(0);
  const angle = useMemo(() => (angleFor(id) * Math.PI) / 180, [id]);

  useEffect(() => {
    const seed = useDeviceStore.getState().devices[id];
    if (seed) radius.set(normalisedRadius(seed.smoothed));
    // Never scale(0): nothing in the real world appears from nothing.
    appear.set(withTiming(1, { duration: 320, easing: EASE_OUT }));

    return useDeviceStore.subscribe((state) => {
      const smoothed = state.devices[id]?.smoothed;
      if (smoothed === undefined) return;
      radius.set(
        withTiming(normalisedRadius(smoothed), { duration: 450, easing: EASE_OUT })
      );
    });
  }, [id, radius, appear]);

  const maxRadius = useDerivedValue(
    () => Math.max(0, Math.min(size.value.width, size.value.height) / 2 - RIM_PADDING)
  );

  const cx = useDerivedValue(
    () => size.value.width / 2 + Math.cos(angle) * radius.value * maxRadius.value
  );
  const cy = useDerivedValue(
    () => size.value.height / 2 + Math.sin(angle) * radius.value * maxRadius.value
  );

  // Colour follows the band, so proximity reads as a luminance ramp of one hue
  // rather than four unrelated colours (DESIGN.md §8).
  const colour = useDerivedValue(() =>
    interpolateColor(radius.value, RADIUS_STOPS, BAND_COLOURS)
  );

  const dot = useDerivedValue(() => 5 + 3 * (1 - radius.value) * appear.value);
  const halo = useDerivedValue(() => dot.value * 3.2);
  const haloOpacity = useDerivedValue(() => 0.28 * (1 - radius.value) * appear.value);

  return (
    <Group>
      <Circle cx={cx} cy={cy} r={halo} color={colour} opacity={haloOpacity} />
      <Circle cx={cx} cy={cy} r={dot} color={colour} opacity={appear} />
    </Group>
  );
}
