import { getLocales } from 'expo-localization';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { readJSON, writeJSON } from '@/storage/kv';
import { en, type Strings } from './en';
import { ptBR } from './pt-BR';

export type Language = 'en' | 'pt-BR';
/** What the user picked in Settings. `system` follows the phone. */
export type LanguagePref = 'system' | Language;

const STRINGS: Record<Language, Strings> = { en, 'pt-BR': ptBR };

/**
 * Any Portuguese locale gets pt-BR: it is the only Portuguese there is, and
 * closer for a pt-PT reader than English. Everything else gets English.
 */
function systemLanguage(): Language {
  return getLocales()[0]?.languageCode === 'pt' ? 'pt-BR' : 'en';
}

const PREF_KEY = 'language';

function loadPref(): LanguagePref {
  const saved = readJSON<string>(PREF_KEY);
  return saved === 'en' || saved === 'pt-BR' ? saved : 'system';
}

type LanguageState = {
  pref: LanguagePref;
  /** The phone's language, refreshed when the app returns to the foreground. */
  system: Language;
  setPref: (pref: LanguagePref) => void;
};

export const useLanguageStore = create<LanguageState>((set) => ({
  pref: loadPref(),
  system: systemLanguage(),
  setPref: (pref) => {
    writeJSON(PREF_KEY, pref);
    set({ pref });
  },
}));

// Android changes the app language (system or per-app) without restarting
// the app, so the locale is read again on every return to the foreground.
AppState.addEventListener('change', (state) => {
  if (state !== 'active') return;
  const system = systemLanguage();
  if (system !== useLanguageStore.getState().system) useLanguageStore.setState({ system });
});

function resolve(pref: LanguagePref, system: Language): Language {
  return pref === 'system' ? system : pref;
}

/** The language in use. For components: re-renders on change. */
export function useLanguage(): Language {
  return useLanguageStore((state) => resolve(state.pref, state.system));
}

/** The strings in use. For components: re-renders on change. */
export function useT(): Strings {
  return STRINGS[useLanguage()];
}

/** For code outside the render tree: alerts, store callbacks. */
export function getLanguage(): Language {
  const { pref, system } = useLanguageStore.getState();
  return resolve(pref, system);
}

export function getT(): Strings {
  return STRINGS[getLanguage()];
}

/** A decimal with the language's separator: "0.8" in English, "0,8" in Portuguese. */
export function decimal(value: string, language: Language): string {
  return language === 'pt-BR' ? value.replaceAll('.', ',') : value;
}

export type { Strings };

/**
 * A device's label in the language in use. Labels the app made up ("Unknown
 * device", "Apple device nearby") are stored in English when the device is
 * first seen and translated here, at display; a broadcast name is shown as is.
 */
export function labelOf(label: string, t: Strings): string {
  return t.generatedLabels[label] ?? label;
}
