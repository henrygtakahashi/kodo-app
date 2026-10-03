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

  // Line and fill come from one builder pass: the line is built, then the same
  // builder is closed down to the floor of the scale for the fill. The fill
  // grounds the trace, so a strong signal reads as a tall area rather than a
  // line floating in empty space.
  const shapes = useDerivedValue(() => {
    const points = history.value.slice(-samples);
    const builder = Skia.PathBuilder.Make();
    if (points.length < 2) {
      const empty = builder.detach();
      return { line: empty, area: empty };
    }

    // The x-axis is fixed to the full window, so a device seen for 3 s draws a
    // short trace on the right rather than stretching 3 s across 20 s of width.
    const step = width / (samples - 1);
    const offset = Math.max(0, samples - points.length);
    const span = RSSI_AT_CENTRE - RSSI_AT_RIM;
    const floor = y + height;
    const firstX = x + offset * step;
    let lastX = firstX;

    for (let i = 0; i < points.length; i += 1) {
      const clamped = Math.min(RSSI_AT_CENTRE, Math.max(RSSI_AT_RIM, points[i]));
      const t = (clamped - RSSI_AT_RIM) / span; // 0 weakest, 1 strongest
      lastX = x + (offset + i) * step;
      const py = floor - t * height;
      if (i === 0) builder.moveTo(lastX, py);
      else builder.lineTo(lastX, py);
    }

    const line = builder.build();
    const area = builder.lineTo(lastX, floor).lineTo(firstX, floor).close().detach();
    return { line, area };
  });
  const path = useDerivedValue(() => shapes.value.line);
  const area = useDerivedValue(() => shapes.value.area);
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
