export const EMA_ALPHA = 0.3;

/** Raw RSSI swings +/-10 dBm on a stationary device; everything shown is smoothed. */
export function ema(previous: number, next: number): number {
  return EMA_ALPHA * next + (1 - EMA_ALPHA) * previous;
}

export type Band = 'immediate' | 'near' | 'far' | 'distant';

/**
 * Fixed thresholds, never auto-scaled to the furthest device: radius must stay a
 * pure function of this device's own signal, or walking toward a target while a
 * nearer device appears would push the target outward (DESIGN.md §4).
 * Starting values — calibrate in a dense room.
 */
export function bandFor(rssi: number): Band {
  if (rssi > -55) return 'immediate';
  if (rssi > -70) return 'near';
  if (rssi > -85) return 'far';
  return 'distant';
}

/**
 * RSSI mapped to a normalised radar radius, 0 at the centre to 1 at the rim.
 *
 * Linear in dBm on purpose. dBm is already logarithmic in power, and free-space
 * path loss goes as 20*log10(distance), so linear-in-dBm is roughly
 * linear-in-log-distance — which is what a radar's rings should read as.
 *
 * Floored above zero so the strongest devices do not pile up on the exact
 * centre point, where they would overlap into an unreadable blob.
 */
export const RSSI_AT_CENTRE = -40;
export const RSSI_AT_RIM = -100;
export const MIN_RADIUS = 0.08;

export function normalisedRadius(rssi: number): number {
  const t = (RSSI_AT_CENTRE - rssi) / (RSSI_AT_CENTRE - RSSI_AT_RIM);
  return Math.min(1, Math.max(MIN_RADIUS, t));
}

/** Band boundaries as radii, for the range rings. */
export const BAND_RADII: { band: Band; radius: number }[] = [
  { band: 'immediate', radius: normalisedRadius(-55) },
  { band: 'near', radius: normalisedRadius(-70) },
  { band: 'far', radius: normalisedRadius(-85) },
  { band: 'distant', radius: 1 },
];

export type Trend = 'approaching' | 'receding' | 'steady';

/** Movement must clear the noise floor before it is called movement. */
export const TREND_THRESHOLD_DB = 3;

/**
 * Compares the recent half of the history against the older half. Comparing
 * single endpoints would report noise as movement; RSSI swings +/-10 dBm on a
 * device that is not moving at all.
 */
export function trendOf(history: number[]): Trend {
  if (history.length < 8) return 'steady';
  const split = Math.floor(history.length / 2);
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  const delta = mean(history.slice(split)) - mean(history.slice(0, split));
  if (delta > TREND_THRESHOLD_DB) return 'approaching';
  if (delta < -TREND_THRESHOLD_DB) return 'receding';
  return 'steady';
}
