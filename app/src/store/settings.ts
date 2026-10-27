/**
 * Persisted app settings (AsyncStorage).
 *
 * Holds the backend base URL and user preferences that should survive restarts.
 * getBaseUrl() is a plain async getter so the api client can read it without a
 * React hook.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'tm.settings.v1';

// The launcher (start.ps1) injects EXPO_PUBLIC_API_URL = http://<PC-LAN-IP>:8000 so a
// physical phone connects with no manual setup. Falls back to the Android emulator alias.
export const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

export type RepeatMode = 'off' | 'all' | 'one';

export type Settings = {
  baseUrl: string;
  autoplay: boolean;
  volume: number; // 0..1
  repeat: RepeatMode;
  shuffle: boolean;
  vinylGesture: boolean; // rotate the vinyl to skip tracks
  recentSearches: string[];
  downloadFolderUri: string | null; // SAF tree URI for saving downloads to the phone
};

const DEFAULTS: Settings = {
  baseUrl: DEFAULT_BASE_URL,
  autoplay: true,
  volume: 1,
  repeat: 'off',
  shuffle: false,
  vinylGesture: true,
  recentSearches: [],
  downloadFolderUri: null,
};

type SettingsStore = Settings & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Settings>) => void;
  addRecentSearch: (q: string) => void;
};

let cachedBaseUrl = DEFAULT_BASE_URL;

async function persist(state: Settings) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // best-effort; ignore write failures
  }
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
        cachedBaseUrl = parsed.baseUrl;
        set({ ...parsed, hydrated: true });
        return;
      }
    } catch {
      // fall through to defaults
    }
    set({ hydrated: true });
  },
  update: (patch) => {
    const next = { ...pick(get()), ...patch };
    cachedBaseUrl = next.baseUrl;
    set(patch);
    void persist(next);
  },
  addRecentSearch: (q) => {
    const query = q.trim();
    if (!query) return;
    const recentSearches = [query, ...get().recentSearches.filter((x) => x.toLowerCase() !== query.toLowerCase())].slice(0, 12);
    set({ recentSearches });
    void persist({ ...pick(get()), recentSearches });
  },
}));

function pick(s: Settings): Settings {
  return {
    baseUrl: s.baseUrl,
    autoplay: s.autoplay,
    volume: s.volume,
    repeat: s.repeat,
    shuffle: s.shuffle,
    vinylGesture: s.vinylGesture,
    recentSearches: s.recentSearches,
    downloadFolderUri: s.downloadFolderUri,
  };
}

/** Synchronous best-effort base URL (already hydrated by the time the UI renders). */
export function baseUrlSync(): string {
  // Prefer the live zustand store value.
  const storeUrl = useSettings.getState().baseUrl;
  if (storeUrl) return storeUrl.replace(/\/+$/, '');
  return (cachedBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/** Non-hook accessor for modules outside React (api client). */
export async function getBaseUrl(): Promise<string> {
  // Prefer the live zustand store value (updated by hydrate + update).
  const storeUrl = useSettings.getState().baseUrl;
  if (storeUrl) {
    cachedBaseUrl = storeUrl;
    return storeUrl.replace(/\/+$/, '');
  }
  // Fallback: read from AsyncStorage if store hasn't hydrated yet.
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const url = (JSON.parse(raw).baseUrl as string) || DEFAULT_BASE_URL;
      cachedBaseUrl = url;
      return url.replace(/\/+$/, '');
    }
  } catch {
    // fall through
  }
  cachedBaseUrl = DEFAULT_BASE_URL;
  return DEFAULT_BASE_URL.replace(/\/+$/, '');
}
