import { LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { HISTORY_LENGTH, useDeviceStore } from '@/store/devices';
import { RSSI_AT_CENTRE, RSSI_AT_RIM, bandFor } from '@/ble/signal';
import { getTheme } from '@/theme/use-theme';

type Props = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** How many of the newest samples to draw across the width. Defaults to the whole history. */
  samples?: number;
};

/**
 * One device's RSSI over time.
 *
 * Samples live in a shared value written straight from a store subscription,
 * and the path is rebuilt in a worklet — React never renders for a signal
 * change (DESIGN.md §2).
 */
export function SignalTrace({ id, x, y, width, height, samples = HISTORY_LENGTH }: Props) {
  const history = useSharedValue<number[]>([]);
  const colour = useSharedValue<string>(getTheme().bands.distant);

  useEffect(() => {
    const read = (points: number[] | undefined, smoothed: number | undefined) => {
      if (!points) return;
      history.set(points);
      if (smoothed !== undefined) colour.set(getTheme().bands[bandFor(smoothed)]);
    };

    const seed = useDeviceStore.getState().devices[id];
    read(seed?.history, seed?.smoothed);

    return useDeviceStore.subscribe((state) => {
      const record = state.devices[id];
      read(record?.history, record?.smoothed);
    });
  }, [id, history, colour]);

  const path = useDerivedValue(() => {
    const points = history.value.slice(-samples);
    const line = Skia.Path.Make();
    if (points.length < 2) return line;

    // The x-axis is fixed to the full window, so a device seen for 3 s draws a
    // short trace on the right rather than stretching 3 s across 20 s of width.
    const step = width / (samples - 1);
    const offset = Math.max(0, samples - points.length);
    const span = RSSI_AT_CENTRE - RSSI_AT_RIM;

    for (let i = 0; i < points.length; i += 1) {
      const clamped = Math.min(RSSI_AT_CENTRE, Math.max(RSSI_AT_RIM, points[i]));
      const t = (clamped - RSSI_AT_RIM) / span; // 0 weakest, 1 strongest
      const px = x + (offset + i) * step;
      const py = y + height - t * height;
      if (i === 0) line.moveTo(px, py);
      else line.lineTo(px, py);
    }
    return line;
  });

  // The same line closed down to the floor of the scale. The fill grounds the
  // trace, so a strong signal reads as a tall area rather than a line floating
  // in empty space.
  const area = useDerivedValue(() => {
    const shape = path.value.copy();
    const bounds = shape.getBounds();
    if (bounds.width === 0) return shape;
    shape.lineTo(bounds.x + bounds.width, y + height);
    shape.lineTo(bounds.x, y + height);
    shape.close();
    return shape;
  });
  const fade = useDerivedValue(() => [`${colour.value}40`, `${colour.value}00`]);

  return (
    <>
      <Path path={area}>
        <LinearGradient start={vec(0, y)} end={vec(0, y + height)} colors={fade} />
      </Path>
      <Path path={path} color={colour} style="stroke" strokeWidth={2} strokeJoin="round" />
    </>
  );
}
