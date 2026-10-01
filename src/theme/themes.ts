/**
 * Graphite (neutral chrome, amber kept for data) and Night, the original amber
 * CRT on a brown-black ground. Both dark: a light palette was built twice and
 * dropped.
 *
 * Every ratio below is computed against that palette's own ground, text at
 * 4.5:1 and non-text graphics at 3:1. Three palettes in a row had a first draft
 * whose faint end failed, so the check runs before the values land, not after.
 */
export type ThemeMode = 'dark' | 'light';

export type Palette = {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  /** Recessed track behind the cadence ticks. */
  track: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  signal: string;
  warning: string;
  danger: string;
  bands: { immediate: string; near: string; far: string; distant: string };
  /** Printed face of the meter. */
  meterFace: string;
  meterInk: string;
  /** Identity-chip hue range, kept inside the amber family. */
  chipFill: (hue: number) => string;
  chipInk: (hue: number) => string;
};

export const darkTheme: Palette = {
  mode: 'dark',
  bg: '#0A0705',
  surface: '#16100B',
  track: '#16100B',
  surfaceRaised: '#211810',
  border: '#2A1F14',
  textPrimary: '#F2D9A8', // 14.60:1
  textSecondary: '#C9A878',
  textTertiary: '#A8855A', // 5.90:1
  signal: '#FFB224', // 11.14:1
  warning: '#FF8A1F',
  danger: '#FF6B35', // 7.08:1
  // Strongest is brightest on a dark ground.
  bands: { immediate: '#FDAE26', near: '#EB9A0F', far: '#C38418', distant: '#92661C' },
  meterFace: '#1C140D',
  meterInk: '#E8CF9E',
  chipFill: (hue) => `hsl(${hue}, 38%, 16%)`,
  chipInk: (hue) => `hsl(${hue}, 62%, 68%)`,
};

/**
 * Neutral chrome, amber data. The default; Night stays selectable beside it.
 *
 * The ground is lifted to three times Night's luminance (0.0069 against
 * 0.0023): near-black under bright text is what makes text bloom. Primary text
 * drops from 14.6:1 to 12.9:1 for the same reason. Amber is kept for what is
 * measured: the band ramp, the meter needle, the selected state. The band ramp
 * is Night's, unchanged; its faint end still clears 3:1 on both ground and
 * track (3.63 / 3.33).
 */
export const graphiteTheme: Palette = {
  mode: 'dark',
  bg: '#121418',
  surface: '#1A1D21',
  track: '#1A1D21',
  surfaceRaised: '#22262B',
  border: '#2C3036',
  textPrimary: '#D5D8DD', // 12.90:1
  textSecondary: '#ABB0B7', // 8.45:1
  textTertiary: '#878D95', // 5.51:1
  signal: '#FFB224', // 10.22:1
  warning: '#FF8A1F', // 7.82:1
  danger: '#FF6B35', // 6.50:1
  bands: { immediate: '#FDAE26', near: '#EB9A0F', far: '#C38418', distant: '#92661C' },
  meterFace: '#1B1E22',
  meterInk: '#D5D8DD', // 11.71:1 on the face
  // Barely tinted, so per-device colour stays a hint and amber stays for data.
  chipFill: (hue) => `hsl(${hue}, 14%, 18%)`,
  chipInk: (hue) => `hsl(${hue}, 30%, 72%)`, // 6.8–7.7:1
};

export type ThemeId = 'night' | 'graphite';

export const themes: Record<ThemeId, Palette> = {
  night: darkTheme,
  graphite: graphiteTheme,
};
