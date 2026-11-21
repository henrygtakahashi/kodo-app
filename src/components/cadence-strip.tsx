import { Group, Path, Rect, RoundedRect, Skia } from '@shopify/react-native-skia';
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
  /**
   * `track` (default) sits the ticks in a recessed fill; `bare` drops the fill
   * for open layouts and keeps a hairline baseline, so the window's extent and
   * an empty stretch still read as measured silence.
   */
  variant?: 'track' | 'bare';
  /** Track fill, or the baseline colour in the `bare` variant. */
  track: string;
  /** Shared time base for every strip, advanced once per store write. */
  clock: SharedValue<number>;
};

/** Ticks stay clear of the track's rounded ends. */
const TRACK_PAD = 3;
/** Matches the row's stale dimming, which cannot reach a shared canvas. */
const STALE_OPACITY = 0.45;

/** Arrival times, plus the instant the path below is drawn relative to. */
type Source = { ticks: number[]; base: number };

/**
 * One tick per advertisement received, laid out on a real time axis.
 *
 * This is the thing a list of MAC addresses hides: devices broadcast on wildly
 * different intervals, from 20 ms to 10.24 s. A beacon draws a dense stripe, a
 * watch a spaced comb, a sleepy sensor a dot every couple of seconds. The
 * rhythm identifies the kind of device before the name does.
 *
 * The path is built once per change in arrivals, positioned relative to the
 * instant it was built. Time passing is a translation of that path by the
 * shared clock, clipped to the track. Rebuilding every strip's path on every
 * clock tick made the UI thread the bottleneck: most devices advertise rarely
 * and their path does not change between ticks.
 */
export function CadenceStrip({
  id,
  x,
  y,
  width,
  height,
  variant = 'track',
  track,
  clock,
}: Props) {
  const source = useSharedValue<Source>({ ticks: [], base: Date.now() });
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
      if (record.arrivals !== last?.arrivals) {
        source.set({ ticks: record.arrivals, base: Date.now() });
      }
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
  }, [id, source, colour, opacity]);

  // The bare variant has no rounded ends to clear, so its ticks run edge to
  // edge and line up with whatever is drawn above them.
  const pad = variant === 'track' ? TRACK_PAD : 0;
  const pxPerMs = (width - pad * 2) / CADENCE_WINDOW_MS;
  const right = x + width - pad;

  // Depends on arrivals only, not on the clock.
  const path = useDerivedValue(() => {
    const { ticks, base } = source.value;
    // One native call to parse a string, not two per tick: a dense strip is
    // hundreds of segments, and every JSI call is paid on the UI thread.
    const top = y + TRACK_PAD;
    const drop = height - TRACK_PAD * 2;
    let d = '';
    for (let i = 0; i < ticks.length; i += 1) {
      const px = right + (ticks[i] - base) * pxPerMs;
      d += `M${Math.round(px * 2) / 2} ${top}v${drop}`;
    }
    return Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make();
  });

  // The right edge is "now": as the clock moves past `base`, the path slides left.
  const slide = useDerivedValue(() => [
    { translateX: (source.value.base - clock.value) * pxPerMs },
  ]);

  // The track makes an empty stretch read as measured silence rather than
  // missing data, and marks where the 10 s window starts and ends.
  return (
    <Group opacity={opacity}>
      {variant === 'track' ? (
        <RoundedRect x={x} y={y} width={width} height={height} r={3} color={track} />
      ) : (
        <Rect x={x} y={y + height - 1} width={width} height={1} color={track} />
      )}
      <Group clip={{ x: x + pad, y, width: width - pad * 2, height }}>
        <Group transform={slide}>
          <Path path={path} color={colour} style="stroke" strokeWidth={1.5} />
        </Group>
      </Group>
    </Group>
  );
}
