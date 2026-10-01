import { create } from 'zustand';

import { themes, type Palette, type ThemeMode } from './themes';

type ThemeState = { mode: ThemeMode; setMode: (mode: ThemeMode) => void };

/**
 * Theme choice is runtime state, not a build-time import, because the user
 * switches it in Settings.
 *
 * Not persisted: no storage dependency is installed yet, so the choice resets
 * on a cold start. Worth adding before release.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  setMode: (mode) => set({ mode }),
}));

/** For React components — re-renders on change. */
export function useTheme(): Palette {
  return themes[useThemeStore((state) => state.mode)];
}

/**
 * For imperative code that is not a component: store subscriptions that write
 * Skia colours into shared values, and anything else outside the render tree.
 */
export function getTheme(): Palette {
  return themes[useThemeStore.getState().mode];
}
