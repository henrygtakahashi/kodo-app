import { Path, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { bandFor } from '@/ble/signal';
import { CADENCE_WINDOW_MS, useDeviceStore } from '@/store/devices';
import { getTheme } from '@/theme/use-theme';

type Props = { id: string; x: number; y: number; width: number; height: number };

type Frame = { times: number[]; now: number };

/**
 * One tick per advertisement received, laid out on a real time axis.
 *
 * This is the thing a list of MAC addresses hides: devices broadcast on wildly
 * different intervals, from 20 ms to 10.24 s. A beacon draws a dense stripe, a
 * watch a spaced comb, a sleepy sensor a dot every couple of seconds. The
 * rhythm identifies the kind of device before the name does.
 */
export function CadenceStrip({ id, x, y, width, height }: Props) {
  const frame = useSharedValue<Frame>({ times: [], now: Date.now() });
  const colour = useSharedValue<string>(getTheme().bands.distant);

  useEffect(() => {
    const read = () => {
      const record = useDeviceStore.getState().devices[id];
      if (!record) return;
      frame.set({ times: record.arrivals, now: Date.now() });
      colour.set(getTheme().bands[bandFor(record.smoothed)]);
    };

    read();
    // Driven by store writes (8 Hz), which also advances `now` so the ticks
    // scroll left instead of piling up at the right edge.
    return useDeviceStore.subscribe(read);
  }, [id, frame, colour]);

  const path = useDerivedValue(() => {
    const { times, now } = frame.value;
    const strip = Skia.Path.Make();
    const start = now - CADENCE_WINDOW_MS;

    for (let i = 0; i < times.length; i += 1) {
      const t = (times[i] - start) / CADENCE_WINDOW_MS;
      if (t < 0 || t > 1) continue;
      const px = x + t * width;
      strip.moveTo(px, y);
      strip.lineTo(px, y + height);
    }
    return strip;
  });

  return <Path path={path} color={colour} style="stroke" strokeWidth={1.5} />;
}
