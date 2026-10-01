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
