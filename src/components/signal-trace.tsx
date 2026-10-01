import { Path, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { HISTORY_LENGTH, useDeviceStore } from '@/store/devices';
import { RSSI_AT_CENTRE, RSSI_AT_RIM, bandFor } from '@/ble/signal';
import { bands } from '@/theme/colors';

type Props = { id: string; x: number; y: number; width: number; height: number };

/**
 * One device's RSSI over time.
 *
 * Samples live in a shared value written straight from a store subscription,
 * and the path is rebuilt in a worklet — React never renders for a signal
 * change (DESIGN.md §2).
 */
export function SignalTrace({ id, x, y, width, height }: Props) {
  const samples = useSharedValue<number[]>([]);
  const colour = useSharedValue<string>(bands.distant);

  useEffect(() => {
    const read = (history: number[] | undefined, smoothed: number | undefined) => {
      if (!history) return;
      samples.set(history);
      if (smoothed !== undefined) colour.set(bands[bandFor(smoothed)]);
    };

    const seed = useDeviceStore.getState().devices[id];
    read(seed?.history, seed?.smoothed);

    return useDeviceStore.subscribe((state) => {
      const record = state.devices[id];
      read(record?.history, record?.smoothed);
    });
  }, [id, samples, colour]);

  const path = useDerivedValue(() => {
    const points = samples.value;
    const line = Skia.Path.Make();
    if (points.length < 2) return line;

    // The x-axis is fixed to the full window, so a device seen for 3 s draws a
    // short trace on the right rather than stretching 3 s across 20 s of width.
    const step = width / (HISTORY_LENGTH - 1);
    const offset = Math.max(0, HISTORY_LENGTH - points.length);
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

  return <Path path={path} color={colour} style="stroke" strokeWidth={2} strokeJoin="round" />;
}
