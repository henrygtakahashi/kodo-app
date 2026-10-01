/**
 * Two palettes, one identity: amber CRT on a dark ground, and the same amber
 * pressed into warm paper for daylight.
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
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  signal: string;
  warning: string;
  danger: string;
  bands: { immediate: string; near: string; far: string; distant: string };
  /** Printed face of the meter — paper-ish in both modes, like real test gear. */
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

export const lightTheme: Palette = {
  mode: 'light',
  bg: '#F5F1E8',
  surface: '#FFFFFF',
  surfaceRaised: '#EBE5D8',
  border: '#D8CFBC',
  textPrimary: '#1C1710', // 15.80:1
  textSecondary: '#4A3F2E', // 9.13:1
  textTertiary: '#6B5C45', // 5.75:1
  signal: '#8A5712', // 5.40:1
  warning: '#8F4E06', // 5.71:1
  danger: '#A33124', // 6.16:1
  // Inverted: strongest is darkest on paper. A light ground caps the faint end
  // at relative luminance 0.2605, so the ramp is compressed into the dark part
  // of the range and colour carries less of the ordinal signal than on dark.
  bands: { immediate: '#684508', near: '#845B15', far: '#997029', distant: '#A27D3F' },
  meterFace: '#FBF7EC',
  meterInk: '#2A2113',
  chipFill: (hue) => `hsl(${hue}, 46%, 88%)`,
  chipInk: (hue) => `hsl(${hue}, 58%, 26%)`,
};

export const themes: Record<ThemeMode, Palette> = { dark: darkTheme, light: lightTheme };
