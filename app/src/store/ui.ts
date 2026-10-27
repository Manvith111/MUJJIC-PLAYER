/**
 * Navigation + search + home-feed state for MUJJIC PLAYER.
 *
 * Single-window app: `view` switches the center content; a persistent mini-player
 * and bottom nav live outside it. Search results are cached per tab type. The
 * home feed pulls a default "quick picks" search so it isn't empty on first run.
 */
import { create } from 'zustand';

import { api, type SearchResponse, type Track } from '../api/client';
import type { TabKey } from '../components/TabBar';
import { useLibrary } from '../db/library';
import { useSettings } from './settings';

export type View = 'home' | 'search' | 'library' | 'nowplaying' | 'queue' | 'settings' | 'playlist';

export type Category = { key: string; label: string; query: string };

export const CATEGORIES: Category[] = [
  { key: 'trending', label: 'Trending', query: 'trending songs 2026' },
  { key: 'classic', label: 'Classic', query: 'classic rock greatest hits' },
  { key: '90s', label: '90s', query: '90s hits' },
  { key: 'new', label: 'New', query: 'new music 2026' },
  { key: 'instrumental', label: 'Instrumental', query: 'instrumental focus music' },
  { key: 'lofi', label: 'Lo-fi', query: 'lofi hip hop beats' },
  { key: 'party', label: 'Party', query: 'party anthems' },
];

const TAB_TO_TYPE: Record<TabKey, 'songs' | 'albums' | 'artists' | 'playlists'> = {
  tracks: 'songs',
  albums: 'albums',
  artists: 'artists',
  playlists: 'playlists',
};

const EMPTY: SearchResponse = { songs: [], albums: [], artists: [], playlists: [] };

type UIStore = {
  view: View;
  tab: TabKey;
  query: string;
  results: SearchResponse;
  loading: boolean;
  error: string | null;
  showHelp: boolean;

  trending: Track[];
  recommended: Track[];
  explore: Track[];
  exploreGenre: string;
  loadingHome: boolean;
  homeError: string | null;

  playlistId: number | null;
  openPlaylist: (id: number) => void;
  addToPlaylistId: number | null; // when set, Search adds to this playlist instead of playing
  creatingPlaylist: boolean; // create-playlist popup visible
  setCreatingPlaylist: (v: boolean) => void;
  importingPlaylist: boolean; // import-from-ytmusic popup visible
  setImportingPlaylist: (v: boolean) => void;

  setView: (v: View) => void;
  setTab: (t: TabKey) => void;
  setQuery: (q: string) => void;
  runSearch: () => Promise<void>;
  openCategory: (c: Category) => Promise<void>;
  loadHome: (force?: boolean) => Promise<void>;
  toggleHelp: () => void;
};

let searchAbort: AbortController | null = null;

export const useUI = create<UIStore>((set, get) => ({
  view: 'home',
  tab: 'tracks',
  query: '',
  results: EMPTY,
  loading: false,
  error: null,
  showHelp: false,
  trending: [],
  recommended: [],
  explore: [],
  exploreGenre: '',
  loadingHome: false,
  homeError: null,
  playlistId: null,
  addToPlaylistId: null,
  creatingPlaylist: false,
  importingPlaylist: false,

  openPlaylist: (id) => set({ playlistId: id, view: 'playlist' }),
  setCreatingPlaylist: (v) => set({ creatingPlaylist: v }),
  setImportingPlaylist: (v) => set({ importingPlaylist: v }),

  setView: (v) => set({ view: v }),
  setTab: (t) => {
    set({ tab: t });
    if (get().query.trim()) void get().runSearch();
  },
  setQuery: (q) => set({ query: q }),
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),

  runSearch: async () => {
    const q = get().query.trim();
    if (!q) {
      set({ results: EMPTY, error: null });
      return;
    }
    useSettings.getState().addRecentSearch(q);
    searchAbort?.abort();
    searchAbort = new AbortController();
    const type = TAB_TO_TYPE[get().tab];
    set({ loading: true, error: null, view: 'search' });
    try {
      const res = await api.search(q, type, searchAbort.signal);
      set((s) => ({ results: { ...s.results, ...res }, loading: false }));
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      set({ loading: false, error: String(e?.message ?? e) });
    }
  },

  openCategory: async (c) => {
    set({ query: c.label, tab: 'tracks' });
    // Search the underlying query but keep the friendly label in the box.
    searchAbort?.abort();
    searchAbort = new AbortController();
    set({ loading: true, error: null, view: 'search' });
    try {
      const res = await api.search(c.query, 'songs', searchAbort.signal);
      set((s) => ({ results: { ...s.results, ...res }, loading: false }));
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      set({ loading: false, error: String(e?.message ?? e) });
    }
  },

  loadHome: async (force = false) => {
    if (!force && (get().trending.length || get().loadingHome)) return;
    set({ loadingHome: true, homeError: null });
    try {
      const res = await api.search('trending songs 2026', 'songs');
      const trending = res.songs.slice(0, 15);
      set({ trending });

      const lib = useLibrary.getState();
      // Seed recommendations from what the user actually plays (top + recent), with a
      // trending pick as fallback, so the row is personalised and varied each visit.
      const seeds: Track[] = [];
      const pushSeed = (t?: Track) => {
        if (t && !seeds.some((s) => s.id === t.id)) seeds.push(t);
      };
      pushSeed(lib.mostListened[0]);
      pushSeed(lib.history[0]);
      pushSeed(lib.mostListened[1]);
      if (!seeds.length && trending.length) pushSeed(trending[Math.floor(Math.random() * Math.min(5, trending.length))]);

      const lists = await Promise.all(seeds.slice(0, 3).map((s) => api.recommend(s.id, 15).catch(() => [] as Track[])));

      // Exclude things the user already has / already sees in Trending.
      const exclude = new Set<string>([
        ...trending.map((t) => t.id),
        ...lib.mostListened.map((t) => t.id),
        ...lib.downloads.map((t) => t.id),
      ]);
      const seen = new Set<string>();
      const recommended: Track[] = [];
      for (let i = 0; i < 15; i++) {
        for (const list of lists) {
          const t = list[i];
          if (t && !seen.has(t.id) && !exclude.has(t.id)) {
            seen.add(t.id);
            recommended.push(t);
          }
        }
      }
      set({ recommended: recommended.slice(0, 20) });

      // Explore: a random genre each visit surfaces new types of music.
      const genres = ['indie', 'jazz', 'electronic', 'rock', 'hip hop', 'classical', 'r&b', 'lofi', 'soul', 'reggae', 'metal', 'k-pop'];
      const genre = genres[Math.floor(Math.random() * genres.length)];
      try {
        const ex = await api.search(`best ${genre} songs`, 'songs');
        set({ explore: ex.songs.slice(0, 15), exploreGenre: genre });
      } catch {
        set({ explore: [] });
      }
      set({ loadingHome: false });
    } catch (e: any) {
      set({ loadingHome: false, homeError: String(e?.message ?? e) });
    }
  },
}));
