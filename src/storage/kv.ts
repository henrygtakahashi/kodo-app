import Storage from 'expo-sqlite/kv-store';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Synchronous key-value storage backed by SQLite.
 *
 * Synchronous on purpose: zustand's persist middleware hydrates a store with a
 * sync storage before the first render, so the saved theme is on screen from
 * the first frame instead of the default flashing first.
 */
const sync: StateStorage = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => {
    Storage.removeItemSync(key);
  },
};

export const kvStorage = createJSONStorage(() => sync);

/** For state persisted by hand rather than through the middleware. */
export function readJSON<T>(key: string): T | null {
  try {
    const raw = Storage.getItemSync(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  Storage.setItemSync(key, JSON.stringify(value));
}
