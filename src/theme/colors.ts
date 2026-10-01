/**
 * Design tokens from DESIGN.md §8. Contrast ratios are computed, not estimated —
 * see that section before changing a value.
 *
 * The app is dark-only (expo-system-ui forces night mode), so there is no light
 * variant by design.
 */
export const colors = {
  bg: '#05070A',
  surface: '#0D1117',
  surfaceRaised: '#161B22',
  border: '#21262D',

  textPrimary: '#E6EDF3', // 17.07:1 on bg — AAA
  textSecondary: '#8B949E', // 6.56:1 — AA
  textTertiary: '#7D8590', // 5.41:1 — AA

  signal: '#00E5A0', // 12.21:1 — AAA
  warning: '#D29922', // 7.99:1 — AAA
  danger: '#F85149', // 6.02:1 — AA
} as const;

/**
 * Proximity bands are a luminance ramp of one hue, not four hues: the bands are
 * ordinal (immediate → distant), so a sequential ramp encodes their order.
 * Luminance descends monotonically and every band clears 3:1 on `bg`, the floor
 * for non-text graphics — a distant blip reads as dim, never as absent.
 */
export const bands = {
  immediate: '#00E5A0', // 12.21:1
  near: '#00B383', // 7.47:1
  far: '#0C7E64', // 4.02:1
  distant: '#3D6E5F', // 3.45:1
} as const;

/** Numeric readouts must use tabular figures — see DESIGN.md §8. */
export const mono = 'monospace';
