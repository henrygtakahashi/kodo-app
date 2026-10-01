import { Canvas, Circle, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { RSSI_AT_CENTRE, RSSI_AT_RIM, bandFor } from '@/ble/signal';
import { useDeviceStore } from '@/store/devices';
import { getTheme, useTheme } from '@/theme/use-theme';
import type { Palette } from '@/theme/themes';

/** 120 degrees of sweep, centred on straight up. 270 is up in Skia's angles. */
const START_ANGLE = 210;
const SWEEP = 120;
const TICKS = 10;

/**
 * A moving-coil meter: printed face, etched scale, a needle on a pivot.
 *
 * A needle is the honest instrument for this reading. It shows the value and
 * its movement in one mark, it has no notion of position, and its lag is a
 * physical property rather than a decorative animation.
 */
export function HuntMeter({ id, width }: { id: string; width: number }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const height = width * 0.6;
  const pivotX = width / 2;
  const pivotY = height * 0.9;
  const radius = height * 0.74;

  const fill = useSharedValue(0);
  const needleColour = useSharedValue<string>(getTheme().bands.distant);

  useEffect(() => {
    const read = (smoothed: number | undefined) => {
      if (smoothed === undefined) return;
      const span = RSSI_AT_CENTRE - RSSI_AT_RIM;
      const clamped = Math.min(RSSI_AT_CENTRE, Math.max(RSSI_AT_RIM, smoothed));
      // Slow and slightly heavy, the way a real coil settles.
      fill.set(
        withTiming((clamped - RSSI_AT_RIM) / span, {
          duration: 520,
          easing: Easing.bezier(0.34, 1.2, 0.5, 1),
        })
      );
      needleColour.set(getTheme().bands[bandFor(smoothed)]);
    };

    read(useDeviceStore.getState().devices[id]?.smoothed);
    return useDeviceStore.subscribe((state) => read(state.devices[id]?.smoothed));
  }, [id, fill, needleColour]);

  // Etched scale: an arc plus graduated ticks, longer every fifth.
  const scale = useMemo(() => {
    const path = Skia.Path.Make();
    const arcR = radius * 0.96;
    path.addArc(
      Skia.XYWHRect(pivotX - arcR, pivotY - arcR, arcR * 2, arcR * 2),
      START_ANGLE,
      SWEEP
    );
    for (let i = 0; i <= TICKS; i += 1) {
      const deg = START_ANGLE + (SWEEP * i) / TICKS;
      const rad = (deg * Math.PI) / 180;
      const major = i % 5 === 0;
      const outer = arcR;
      const inner = arcR - (major ? height * 0.13 : height * 0.07);
      path.moveTo(pivotX + outer * Math.cos(rad), pivotY + outer * Math.sin(rad));
      path.lineTo(pivotX + inner * Math.cos(rad), pivotY + inner * Math.sin(rad));
    }
    return path;
  }, [pivotX, pivotY, radius, height]);

  const needle = useDerivedValue(() => {
    const deg = START_ANGLE + SWEEP * fill.value;
    const rad = (deg * Math.PI) / 180;
    const path = Skia.Path.Make();
    // A counterweight tail past the pivot, like the real thing.
    path.moveTo(pivotX - radius * 0.12 * Math.cos(rad), pivotY - radius * 0.12 * Math.sin(rad));
    path.lineTo(pivotX + radius * 0.9 * Math.cos(rad), pivotY + radius * 0.9 * Math.sin(rad));
    return path;
  });

  return (
    <View style={{ width, height }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <RoundedRect x={0} y={0} width={width} height={height} r={4} color={theme.meterFace} />
        <RoundedRect
          x={0.5}
          y={0.5}
          width={width - 1}
          height={height - 1}
          r={4}
          color={theme.border}
          style="stroke"
          strokeWidth={1}
        />
        <Path path={scale} color={theme.meterInk} style="stroke" strokeWidth={1.5} />
        <Path path={needle} color={needleColour} style="stroke" strokeWidth={2.5} strokeCap="round" />
        <Circle cx={pivotX} cy={pivotY} r={5} color={theme.meterInk} />
      </Canvas>

      <Text style={[styles.endLabel, { left: 10, bottom: height * 0.06 }]}>−100</Text>
      <Text style={[styles.endLabel, { right: 10, bottom: height * 0.06 }]}>−40</Text>
      {/* Below the arc, not inside it: at the top it collided with the scale. */}
      <Text style={[styles.faceLabel, { top: height * 0.54 }]}>dBm</Text>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    endLabel: { position: 'absolute', color: t.meterInk, fontSize: 10, fontFamily: 'monospace' },
    faceLabel: {
      position: 'absolute',
      alignSelf: 'center',
      color: t.meterInk,
      fontSize: 10,
      letterSpacing: 3,
    },
  });
