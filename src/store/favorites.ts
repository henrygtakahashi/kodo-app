import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { DeviceKind } from '@/ble/kind';
import { kvStorage } from '@/storage/kv';

export type Favorite = {
  /** The address the device had when it was starred. Also the key. */
  id: string;
  /** Broadcast name, if it sent one. The fallback match for rotating addresses. */
  name: string | null;
  label: string;
  kind: DeviceKind | null;
  savedAt: number;
};

/** What a match needs to know about a device, so this file stays free of the device store. */
export type FavoriteCandidate = { id: string; name: string | null };

export type FavoriteMatch = { favorite: Favorite; by: 'address' | 'name' };

type FavoritesState = {
  favorites: Record<string, Favorite>;
  add: (favorite: Omit<Favorite, 'savedAt'>) => void;
  remove: (id: string) => void;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: {},
      add: (favorite) =>
        set({ favorites: { ...get().favorites, [favorite.id]: { ...favorite, savedAt: Date.now() } } }),
      remove: (id) => {
        const { [id]: _removed, ...rest } = get().favorites;
        set({ favorites: rest });
      },
    }),
    { name: 'favorites', storage: kvStorage }
  )
);

/**
 * Many devices rotate their address for privacy (phones, Apple products,
 * Microsoft beacons), so the address a favorite was saved under may never be
 * seen again. Address first, because it is exact; then the exact broadcast
 * name, which survives a rotation. Unnamed devices with a rotating address
 * cannot be recognised again, and nothing here pretends otherwise.
 */
export function findFavorite(
  favorites: Record<string, Favorite>,
  device: FavoriteCandidate
): FavoriteMatch | null {
  const direct = favorites[device.id];
  if (direct) return { favorite: direct, by: 'address' };
  if (!device.name) return null;
  for (const id in favorites) {
    if (favorites[id].name === device.name) return { favorite: favorites[id], by: 'name' };
  }
  return null;
}
