/**
 * Amber CRT. Deep brown-black ground, warm bone text, one amber for signal.
 *
 * Monochrome by intent: proximity is ordinal, so it must read as a luminance
 * ramp of a single hue rather than four unrelated colours.
 *
 * Contrast ratios are computed, not estimated. Re-run the check before changing
 * a value.
 */
export const colors = {
  bg: '#0A0705', // deep brown-black
  surface: '#16100B',
  surfaceRaised: '#211810',
  border: '#2A1F14',

  textPrimary: '#F2D9A8', // 14.60:1 on bg — AAA
  textSecondary: '#C9A878', // AAA
  textTertiary: '#A8855A', // 5.90:1 — AA

  signal: '#FFB224', // 11.14:1 — AAA
  warning: '#FF8A1F',
  danger: '#FF6B35', // 7.08:1 — AA
} as const;

/**
 * Proximity bands: strongest is brightest on this dark ground.
 *
 * The first ramp drafted for this theme put `distant` at #543A0D, which is
 * 1.90:1 — below the 3:1 floor for non-text graphics, so a distant device would
 * have been effectively invisible. These values are solved against that floor
 * instead: luminance descends monotonically and every step clears 3:1.
 *
 * Amber constrains the usable spread to about 3.3x (0.5129 → 0.1570), narrower
 * than a green ramp on the same ground. Band name and list position still carry
 * the ordinal reading; colour reinforces it.
 */
export const bands = {
  immediate: '#FDAE26', // 10.77:1
  near: '#EB9A0F', // 8.76:1
  far: '#C38418', // 6.35:1
  distant: '#92661C', // 3.96:1
} as const;

/** Numeric readouts must use tabular figures — see DESIGN.md §8. */
export const mono = 'monospace';

/**
 * Identity chips from the device-id hash. Hue stays inside the amber family
 * (see hash.ts) so per-device colour cannot fight the single-hue palette.
 */
export function chipFill(hue: number): string {
  return `hsl(${hue}, 38%, 16%)`;
}
export function chipInk(hue: number): string {
  return `hsl(${hue}, 62%, 68%)`;
}
