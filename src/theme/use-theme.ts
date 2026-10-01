import { create } from 'zustand';

import { themes, type Palette, type ThemeId } from './themes';

type ThemeState = { themeId: ThemeId; setThemeId: (themeId: ThemeId) => void };

/**
 * Theme choice is runtime state, not a build-time import, because the user
 * switches it in Settings.
 *
 * Not persisted: no storage dependency is installed yet, so the choice resets
 * to Graphite on a cold start. Worth adding before release.
 */
export const useThemeStore = create<ThemeState>((set) => ({
  themeId: 'graphite',
  setThemeId: (themeId) => set({ themeId }),
}));

/** For React components — re-renders on change. */
export function useTheme(): Palette {
  return themes[useThemeStore((state) => state.themeId)];
}

/**
 * For imperative code that is not a component: store subscriptions that write
 * Skia colours into shared values, and anything else outside the render tree.
 */
export function getTheme(): Palette {
  return themes[useThemeStore.getState().themeId];
}
