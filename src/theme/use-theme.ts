import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { kvStorage } from '@/storage/kv';
import { themes, type Palette, type ThemeId } from './themes';

type ThemeState = { themeId: ThemeId; setThemeId: (themeId: ThemeId) => void };

/**
 * Theme choice is runtime state, not a build-time import, because the user
 * switches it in Settings. Persisted, and hydrated synchronously so the saved
 * palette is on screen from the first frame.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: 'graphite',
      setThemeId: (themeId) => set({ themeId }),
    }),
    {
      name: 'theme',
      storage: kvStorage,
      partialize: (state) => ({ themeId: state.themeId }),
      // A palette can be removed (Daylight was); a stale id must not crash the
      // app on launch, so anything unknown falls back to the default.
      merge: (persisted, current) => {
        const id = (persisted as Partial<ThemeState> | undefined)?.themeId;
        return id && id in themes ? { ...current, themeId: id } : current;
      },
    }
  )
);

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
