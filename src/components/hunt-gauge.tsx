import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { RSSI_AT_CENTRE, RSSI_AT_RIM, bandFor } from '@/ble/signal';
import { useDeviceStore } from '@/store/devices';
import { bands, colors } from '@/theme/colors';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const STROKE = 14;
/** Classic gauge: opens at the bottom, sweeps 270 degrees. */
const START_ANGLE = 135;
const SWEEP = 270;

function arc(size: number, fraction: number) {
  'worklet';
  const inset = STROKE / 2 + 2;
  const rect = Skia.XYWHRect(inset, inset, size - inset * 2, size - inset * 2);
  const path = Skia.Path.Make();
  path.addArc(rect, START_ANGLE, SWEEP * fraction);
  return path;
}

/**
 * Signal as a dial. Strength maps to arc fill, so "more" is unambiguous at
 * arm's length — the one reading that matters while walking.
 */
export function HuntGauge({ id, size }: { id: string; size: number }) {
  const fill = useSharedValue(0);
  const colour = useSharedValue<string>(bands.distant);

  useEffect(() => {
    const read = (smoothed: number | undefined) => {
      if (smoothed === undefined) return;
      const span = RSSI_AT_CENTRE - RSSI_AT_RIM;
      const clamped = Math.min(RSSI_AT_CENTRE, Math.max(RSSI_AT_RIM, smoothed));
      fill.set(withTiming((clamped - RSSI_AT_RIM) / span, { duration: 420, easing: EASE_OUT }));
      colour.set(bands[bandFor(smoothed)]);
    };

    read(useDeviceStore.getState().devices[id]?.smoothed);
    return useDeviceStore.subscribe((state) => read(state.devices[id]?.smoothed));
  }, [id, fill, colour]);

  const track = useDerivedValue(() => arc(size, 1));
  const value = useDerivedValue(() => arc(size, fill.value));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={track} color={colors.border} style="stroke" strokeWidth={STROKE} strokeCap="round" />
        <Path path={value} color={colour} style="stroke" strokeWidth={STROKE} strokeCap="round" />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
});
