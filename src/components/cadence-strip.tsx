import { Group, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { bandFor } from '@/ble/signal';
import { CADENCE_WINDOW_MS, useDeviceStore } from '@/store/devices';
import { getTheme } from '@/theme/use-theme';

type Props = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Fill of the recessed track that frames the window. */
  track: string;
};

/** Ticks stay clear of the track's rounded ends. */
const TRACK_PAD = 3;
/** Matches the row's stale dimming, which cannot reach a shared canvas. */
const STALE_OPACITY = 0.45;

type Frame = { times: number[]; now: number };

/**
 * One tick per advertisement received, laid out on a real time axis.
 *
 * This is the thing a list of MAC addresses hides: devices broadcast on wildly
 * different intervals, from 20 ms to 10.24 s. A beacon draws a dense stripe, a
 * watch a spaced comb, a sleepy sensor a dot every couple of seconds. The
 * rhythm identifies the kind of device before the name does.
 */
export function CadenceStrip({ id, x, y, width, height, track }: Props) {
  const frame = useSharedValue<Frame>({ times: [], now: Date.now() });
  const colour = useSharedValue<string>(getTheme().bands.distant);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const read = () => {
      const record = useDeviceStore.getState().devices[id];
      if (!record) return;
      frame.set({ times: record.arrivals, now: Date.now() });
      colour.set(getTheme().bands[bandFor(record.smoothed)]);
      opacity.set(record.staleness === 'stale' ? STALE_OPACITY : 1);
    };

    read();
    // Driven by store writes (8 Hz), which also advances `now` so the ticks
    // scroll left instead of piling up at the right edge.
    return useDeviceStore.subscribe(read);
  }, [id, frame, colour, opacity]);

  const path = useDerivedValue(() => {
    const { times, now } = frame.value;
    const strip = Skia.Path.Make();
    const start = now - CADENCE_WINDOW_MS;
    const left = x + TRACK_PAD;
    const span = width - TRACK_PAD * 2;

    for (let i = 0; i < times.length; i += 1) {
      const t = (times[i] - start) / CADENCE_WINDOW_MS;
      if (t < 0 || t > 1) continue;
      const px = left + t * span;
      strip.moveTo(px, y + TRACK_PAD);
      strip.lineTo(px, y + height - TRACK_PAD);
    }
    return strip;
  });

  // The track makes an empty stretch read as measured silence rather than
  // missing data, and marks where the 10 s window starts and ends.
  return (
    <Group opacity={opacity}>
      <RoundedRect x={x} y={y} width={width} height={height} r={3} color={track} />
      <Path path={path} color={colour} style="stroke" strokeWidth={1.5} />
    </Group>
  );
}
