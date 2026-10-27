/**
 * Web library backed by AsyncStorage (localStorage on web) so favorites,
 * downloads, playlists, pinned, and history survive a page refresh. Native uses
 * SQLite via the .ts file; Metro picks this .web.ts on web.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Track } from '../api/client';

export type PlaylistMeta = { id: number; name: string; covers: string[]; count: number; offline: boolean };

const KEY = 'tm.library.web.v1';

type Persisted = {
  favorites: Track[];
  downloads: Track[];
  pinned: Track[];
  history: Track[];
  playlists: { id: number; name: string; offline?: boolean }[];
  playlistTracks: Record<number, Track[]>;
  seq: number;
};

const mem: Persisted = {
  favorites: [],
  downloads: [],
  pinned: [],
  history: [],
  playlists: [],
  playlistTracks: {},
  seq: 1,
};

let loaded = false;

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) Object.assign(mem, JSON.parse(raw));
  } catch {
    // start empty
  }
}

function persist() {
  void AsyncStorage.setItem(KEY, JSON.stringify(mem)).catch(() => {});
}

function metas(): PlaylistMeta[] {
  return [...mem.playlists].reverse().map((p) => ({
    id: p.id,
    name: p.name,
    covers: (mem.playlistTracks[p.id] ?? []).slice(0, 4).map((t) => t.thumbnail).filter(Boolean) as string[],
    count: (mem.playlistTracks[p.id] ?? []).length,
    offline: !!p.offline,
  }));
}

function topPlayed(): Track[] {
  const counts = new Map<string, { t: Track; n: number }>();
  for (const t of mem.history) {
    const e = counts.get(t.id);
    if (e) e.n++;
    else counts.set(t.id, { t, n: 1 });
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 20).map((e) => e.t);
}

function recentUnique(): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (let i = mem.history.length - 1; i >= 0; i--) {
    const t = mem.history[i];
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
    if (out.length >= 100) break;
  }
  return out;
}

type LibraryStore = {
  favorites: Track[];
  downloads: Track[];
  playlists: PlaylistMeta[];
  history: Track[];
  mostListened: Track[];
  pinned: Track[];
  refreshAll: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  refreshDownloads: () => Promise<void>;
  refreshPlaylists: () => Promise<void>;
  refreshPinned: () => Promise<void>;
  isFavorite: (id: string) => boolean;
  isDownloaded: (id: string) => boolean;
  isPinned: (id: string) => boolean;
};

export const useLibrary = create<LibraryStore>((set, get) => ({
  favorites: [],
  downloads: [],
  playlists: [],
  history: [],
  mostListened: [],
  pinned: [],
  refreshAll: async () => {
    await load();
    set({
      favorites: [...mem.favorites].reverse(),
      downloads: [...mem.downloads].reverse(),
      playlists: metas(),
      history: recentUnique(),
      mostListened: topPlayed(),
      pinned: [...mem.pinned].reverse(),
    });
  },
  refreshFavorites: async () => set({ favorites: [...mem.favorites].reverse() }),
  refreshDownloads: async () => set({ downloads: [...mem.downloads].reverse() }),
  refreshPlaylists: async () => set({ playlists: metas() }),
  refreshPinned: async () => set({ pinned: [...mem.pinned].reverse() }),
  isFavorite: (id) => mem.favorites.some((t) => t.id === id),
  isDownloaded: (id) => mem.downloads.some((t) => t.id === id),
  isPinned: (id) => mem.pinned.some((t) => t.id === id),
}));

function toggleIn(list: Track[], t: Track): boolean {
  const i = list.findIndex((x) => x.id === t.id);
  if (i >= 0) {
    list.splice(i, 1);
    persist();
    return false;
  }
  list.push(t);
  persist();
  return true;
}

export async function toggleFavorite(t: Track): Promise<boolean> {
  return toggleIn(mem.favorites, t);
}

export async function togglePin(t: Track): Promise<boolean> {
  return toggleIn(mem.pinned, t);
}

export async function pushHistory(t: Track) {
  mem.history.push(t);
  if (mem.history.length > 2000) mem.history.splice(0, mem.history.length - 2000);
  persist();
}

export async function registerDownload(t: Track, localUri: string) {
  const i = mem.downloads.findIndex((x) => x.id === t.id);
  const rec = { ...t, localUri };
  if (i >= 0) mem.downloads[i] = rec;
  else mem.downloads.push(rec);
  persist();
}

export async function removeDownloadRow(id: string) {
  mem.downloads = mem.downloads.filter((t) => t.id !== id);
  persist();
}

export async function getDownload(id: string): Promise<Track | null> {
  return mem.downloads.find((t) => t.id === id) ?? null;
}

export async function createPlaylist(name: string): Promise<number> {
  const id = mem.seq++;
  mem.playlists.push({ id, name });
  mem.playlistTracks[id] = [];
  persist();
  return id;
}

export async function addToPlaylist(playlistId: number, t: Track) {
  const list = mem.playlistTracks[playlistId] ?? [];
  list.push(t);
  mem.playlistTracks[playlistId] = list;
  persist();
}

export async function getPlaylistTracks(playlistId: number): Promise<Track[]> {
  return [...(mem.playlistTracks[playlistId] ?? [])];
}

export async function removeFromPlaylist(playlistId: number, trackId: string) {
  mem.playlistTracks[playlistId] = (mem.playlistTracks[playlistId] ?? []).filter((t) => t.id !== trackId);
  persist();
}

export async function setPlaylistTracks(playlistId: number, tracks: Track[]) {
  mem.playlistTracks[playlistId] = [...tracks];
  persist();
}

export async function deletePlaylist(playlistId: number) {
  delete mem.playlistTracks[playlistId];
  mem.playlists = mem.playlists.filter((p) => p.id !== playlistId);
  persist();
}

export async function renamePlaylist(playlistId: number, name: string) {
  const p = mem.playlists.find((x) => x.id === playlistId);
  if (p) {
    p.name = name;
    persist();
  }
}

export async function setPlaylistOffline(playlistId: number, offline: boolean) {
  const p = mem.playlists.find((x) => x.id === playlistId);
  if (p) {
    p.offline = offline;
    persist();
  }
}

export async function initLibrary() {
  await load();
  await useLibrary.getState().refreshAll();
}
