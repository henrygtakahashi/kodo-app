import { Group, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { type SharedValue, useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { bandFor } from '@/ble/signal';
import { CADENCE_WINDOW_MS, type DeviceRecord, useDeviceStore } from '@/store/devices';
import { getTheme } from '@/theme/use-theme';

type Props = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Fill of the recessed track that frames the window. */
  track: string;
  /** Shared time base for every strip, advanced once per store write. */
  clock: SharedValue<number>;
  /** List scroll offset and viewport height, for skipping off-screen strips. */
  scrollY: SharedValue<number>;
  viewport: SharedValue<number>;
};

/** Ticks stay clear of the track's rounded ends. */
const TRACK_PAD = 3;
/** Matches the row's stale dimming, which cannot reach a shared canvas. */
const STALE_OPACITY = 0.45;

/**
 * One tick per advertisement received, laid out on a real time axis.
 *
 * This is the thing a list of MAC addresses hides: devices broadcast on wildly
 * different intervals, from 20 ms to 10.24 s. A beacon draws a dense stripe, a
 * watch a spaced comb, a sleepy sensor a dot every couple of seconds. The
 * rhythm identifies the kind of device before the name does.
 */
export function CadenceStrip({ id, x, y, width, height, track, clock, scrollY, viewport }: Props) {
  const times = useSharedValue<number[]>([]);
  const colour = useSharedValue<string>(getTheme().bands.distant);
  const opacity = useSharedValue(1);

  useEffect(() => {
    let last: DeviceRecord | undefined;
    let lastColour: string | null = null;

    const read = () => {
      const record = useDeviceStore.getState().devices[id];
      // Every strip hears every store write. `merge` only replaces the records
      // that received packets, so an unchanged object means nothing to do —
      // without this, each write costs one array copy to the UI thread per
      // device, which is the work that grows with the length of the list.
      if (!record || record === last) return;
      if (record.arrivals !== last?.arrivals) times.set(record.arrivals);
      // Compared as the resolved colour, so a theme switch lands too.
      const next = getTheme().bands[bandFor(record.smoothed)];
      if (next !== lastColour) colour.set(next);
      if (record.staleness !== last?.staleness) {
        opacity.set(record.staleness === 'stale' ? STALE_OPACITY : 1);
      }
      last = record;
      lastColour = next;
    };

    read();
    return useDeviceStore.subscribe(read);
  }, [id, times, colour, opacity]);

  const path = useDerivedValue(() => {
    const strip = Skia.Path.Make();
    // Off-screen strips are skipped; the canvas spans the whole list.
    const top = scrollY.value;
    if (y + height < top || y > top + viewport.value) return strip;

    const ticks = times.value;
    const start = clock.value - CADENCE_WINDOW_MS;
    const left = x + TRACK_PAD;
    const span = width - TRACK_PAD * 2;

    for (let i = 0; i < ticks.length; i += 1) {
      const t = (ticks[i] - start) / CADENCE_WINDOW_MS;
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
