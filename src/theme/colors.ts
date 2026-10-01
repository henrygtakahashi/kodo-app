/**
 * Daylight technical palette. Paper ground, ink text, one deep green for signal.
 *
 * Dark was the obvious choice for a scanner and also the generic one. This app
 * is used outdoors, walking, hunting a device — a near-black screen is the
 * hardest thing to read in sunlight, so the ground is paper.
 *
 * Contrast ratios below are computed, not estimated. Re-run the check before
 * changing a value.
 */
export const colors = {
  bg: '#F2F0EB', // paper
  surface: '#FFFFFF',
  surfaceRaised: '#E7E3DA', // pressed / elevated
  border: '#D6D2C8',

  textPrimary: '#1A1814', // 15.56:1 on bg — AAA
  textSecondary: '#4A453D', // 8.34:1 — AAA
  textTertiary: '#655F55', // 5.33:1 — AA

  signal: '#0B6E4F', // 5.49:1 — AA
  warning: '#8A5712', // 5.34:1 — AA
  danger: '#B33A2B', // 5.18:1 — AA
} as const;

/**
 * Proximity bands, inverted for a light ground: strongest is darkest.
 *
 * A light background caps how faint the weak end may be. At 3:1 — the floor for
 * non-text graphics — nothing lighter than relative luminance 0.2573 is legible
 * on this paper, so the whole ramp is compressed into the dark quarter of the
 * range (0.0999 → 0.2558, a 2.6x spread). On the old near-black ground the same
 * ramp spanned nearly 10x.
 *
 * Consequence, and it is a real one: colour carries less of the ordinal signal
 * here than it did on dark. The band name and the position in the list must
 * carry it, with colour reinforcing rather than encoding alone.
 */
export const bands = {
  immediate: '#15654C', // 6.15:1
  near: '#288164', // 4.18:1
  far: '#3E9378', // 3.26:1
  distant: '#539782', // 3.01:1
} as const;

/** Numeric readouts must use tabular figures — see DESIGN.md §8. */
export const mono = 'monospace';

/**
 * Identity chip colours from the device-id hash. On paper the fill is light and
 * the glyph is dark, the reverse of the old dark theme.
 */
export function chipFill(hue: number): string {
  return `hsl(${hue}, 32%, 88%)`;
}
export function chipInk(hue: number): string {
  return `hsl(${hue}, 45%, 26%)`;
}
