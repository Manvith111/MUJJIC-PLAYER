/**
 * Local library persisted in SQLite (expo-sqlite async API).
 *
 * Covers favorites, play history, user playlists, and the registry of
 * downloaded tracks (for offline playback). A small zustand store caches the
 * lists the UI renders and exposes mutations that write-through to the DB.
 */
import * as SQLite from 'expo-sqlite';
import { create } from 'zustand';

import type { Track } from '../api/client';

let db: SQLite.SQLiteDatabase | null = null;

const TRACK_COLS = 'id, title, artist, album, duration, durationText, thumbnail';

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('terminalmusic.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY, title TEXT, artist TEXT, album TEXT,
      duration INTEGER, durationText TEXT, thumbnail TEXT, addedAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS pinned (
      id TEXT PRIMARY KEY, title TEXT, artist TEXT, album TEXT,
      duration INTEGER, durationText TEXT, thumbnail TEXT, addedAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY, title TEXT, artist TEXT, album TEXT,
      duration INTEGER, durationText TEXT, thumbnail TEXT,
      localUri TEXT, downloadedAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS history (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT, title TEXT, artist TEXT, thumbnail TEXT, playedAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, createdAt INTEGER
    );
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlistId INTEGER, trackId TEXT, title TEXT, artist TEXT, album TEXT,
      duration INTEGER, durationText TEXT, thumbnail TEXT, position INTEGER
    );
  `);
  await migrate(db);
  return db;
}

/** Lightweight, additive migrations keyed off PRAGMA user_version. */
async function migrate(d: SQLite.SQLiteDatabase) {
  const row = await d.getFirstAsync<{ user_version: number }>(`PRAGMA user_version`);
  const version = row?.user_version ?? 0;
  if (version < 1) {
    // v1: mark playlists that have been downloaded for offline listening.
    await d.execAsync(`ALTER TABLE playlists ADD COLUMN offline INTEGER DEFAULT 0`);
    await d.execAsync(`PRAGMA user_version = 1`);
  }
}

function rowToTrack(r: any): Track {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist ?? '',
    album: r.album,
    duration: r.duration,
    durationText: r.durationText,
    thumbnail: r.thumbnail,
    localUri: r.localUri ?? undefined,
  };
}

// ---- Favorites ----
export async function toggleFavorite(t: Track): Promise<boolean> {
  const d = await getDb();
  const existing = await d.getFirstAsync(`SELECT id FROM favorites WHERE id = ?`, [t.id]);
  if (existing) {
    await d.runAsync(`DELETE FROM favorites WHERE id = ?`, [t.id]);
    return false;
  }
  await d.runAsync(
    `INSERT OR REPLACE INTO favorites (${TRACK_COLS}, addedAt) VALUES (?,?,?,?,?,?,?,?)`,
    [t.id, t.title, t.artist, t.album ?? null, t.duration ?? null, t.durationText ?? null, t.thumbnail ?? null, Date.now()],
  );
  return true;
}

// ---- Pinned (speed dial) ----
export async function togglePin(t: Track): Promise<boolean> {
  const d = await getDb();
  const existing = await d.getFirstAsync(`SELECT id FROM pinned WHERE id = ?`, [t.id]);
  if (existing) {
    await d.runAsync(`DELETE FROM pinned WHERE id = ?`, [t.id]);
    return false;
  }
  await d.runAsync(
    `INSERT OR REPLACE INTO pinned (${TRACK_COLS}, addedAt) VALUES (?,?,?,?,?,?,?,?)`,
    [t.id, t.title, t.artist, t.album ?? null, t.duration ?? null, t.durationText ?? null, t.thumbnail ?? null, Date.now()],
  );
  return true;
}

// ---- History ----
export async function pushHistory(t: Track) {
  const d = await getDb();
  await d.runAsync(`INSERT INTO history (id, title, artist, thumbnail, playedAt) VALUES (?,?,?,?,?)`, [
    t.id,
    t.title,
    t.artist,
    t.thumbnail ?? null,
    Date.now(),
  ]);
}

// ---- Downloads ----
export async function registerDownload(t: Track, localUri: string) {
  const d = await getDb();
  await d.runAsync(
    `INSERT OR REPLACE INTO downloads (${TRACK_COLS}, localUri, downloadedAt) VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      t.id, t.title, t.artist, t.album ?? null, t.duration ?? null,
      t.durationText ?? null, t.thumbnail ?? null, localUri, Date.now(),
    ],
  );
}

export async function removeDownloadRow(id: string) {
  const d = await getDb();
  await d.runAsync(`DELETE FROM downloads WHERE id = ?`, [id]);
}

export async function getDownload(id: string): Promise<Track | null> {
  const d = await getDb();
  const r = await d.getFirstAsync(`SELECT *, localUri FROM downloads WHERE id = ?`, [id]);
  return r ? rowToTrack(r) : null;
}

// ---- Playlists ----
export async function createPlaylist(name: string): Promise<number> {
  const d = await getDb();
  const res = await d.runAsync(`INSERT INTO playlists (name, createdAt) VALUES (?, ?)`, [name, Date.now()]);
  return res.lastInsertRowId as number;
}

export async function addToPlaylist(playlistId: number, t: Track) {
  const d = await getDb();
  const row = await d.getFirstAsync<{ n: number }>(
    `SELECT COALESCE(MAX(position), -1) + 1 AS n FROM playlist_tracks WHERE playlistId = ?`,
    [playlistId],
  );
  await d.runAsync(
    `INSERT INTO playlist_tracks (playlistId, trackId, title, artist, album, duration, durationText, thumbnail, position)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [playlistId, t.id, t.title, t.artist, t.album ?? null, t.duration ?? null, t.durationText ?? null, t.thumbnail ?? null, row?.n ?? 0],
  );
}

export async function getPlaylistTracks(playlistId: number): Promise<Track[]> {
  const d = await getDb();
  const rows = await d.getAllAsync(
    `SELECT trackId AS id, title, artist, album, duration, durationText, thumbnail
     FROM playlist_tracks WHERE playlistId = ? ORDER BY position ASC`,
    [playlistId],
  );
  return rows.map(rowToTrack);
}

export async function removeFromPlaylist(playlistId: number, trackId: string) {
  const d = await getDb();
  await d.runAsync(`DELETE FROM playlist_tracks WHERE playlistId = ? AND trackId = ?`, [playlistId, trackId]);
}

/** Replace a playlist's tracks in the given order (used by reordering). */
export async function setPlaylistTracks(playlistId: number, tracks: Track[]) {
  const d = await getDb();
  await d.runAsync(`DELETE FROM playlist_tracks WHERE playlistId = ?`, [playlistId]);
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    await d.runAsync(
      `INSERT INTO playlist_tracks (playlistId, trackId, title, artist, album, duration, durationText, thumbnail, position)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [playlistId, t.id, t.title, t.artist, t.album ?? null, t.duration ?? null, t.durationText ?? null, t.thumbnail ?? null, i],
    );
  }
}

export async function deletePlaylist(playlistId: number) {
  const d = await getDb();
  await d.runAsync(`DELETE FROM playlist_tracks WHERE playlistId = ?`, [playlistId]);
  await d.runAsync(`DELETE FROM playlists WHERE id = ?`, [playlistId]);
}

export async function renamePlaylist(playlistId: number, name: string) {
  const d = await getDb();
  await d.runAsync(`UPDATE playlists SET name = ? WHERE id = ?`, [name, playlistId]);
}

/** Flag/unflag a playlist as downloaded-for-offline (drives the "Offline" tag). */
export async function setPlaylistOffline(playlistId: number, offline: boolean) {
  const d = await getDb();
  await d.runAsync(`UPDATE playlists SET offline = ? WHERE id = ?`, [offline ? 1 : 0, playlistId]);
}

// ---- Cached store for the UI ----
export type PlaylistMeta = { id: number; name: string; covers: string[]; count: number; offline: boolean };

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
    await Promise.all([get().refreshFavorites(), get().refreshDownloads(), get().refreshPlaylists(), get().refreshPinned()]);
    const d = await getDb();
    const hist = await d.getAllAsync(
      `SELECT id, title, artist, thumbnail, MAX(playedAt) AS playedAt FROM history GROUP BY id ORDER BY playedAt DESC LIMIT 100`,
    );
    const top = await d.getAllAsync(
      `SELECT id, title, artist, thumbnail, COUNT(*) AS plays FROM history GROUP BY id ORDER BY plays DESC, MAX(playedAt) DESC LIMIT 20`,
    );
    set({ history: hist.map(rowToTrack), mostListened: top.map(rowToTrack) });
  },
  refreshFavorites: async () => {
    const d = await getDb();
    const rows = await d.getAllAsync(`SELECT * FROM favorites ORDER BY addedAt DESC`);
    set({ favorites: rows.map(rowToTrack) });
  },
  refreshPinned: async () => {
    const d = await getDb();
    const rows = await d.getAllAsync(`SELECT * FROM pinned ORDER BY addedAt DESC`);
    set({ pinned: rows.map(rowToTrack) });
  },
  refreshDownloads: async () => {
    const d = await getDb();
    const rows = await d.getAllAsync(`SELECT *, localUri FROM downloads ORDER BY downloadedAt DESC`);
    set({ downloads: rows.map(rowToTrack) });
  },
  refreshPlaylists: async () => {
    const d = await getDb();
    const rows = await d.getAllAsync<{ id: number; name: string; offline: number }>(
      `SELECT id, name, offline FROM playlists ORDER BY createdAt DESC`,
    );
    const withCovers: PlaylistMeta[] = [];
    for (const r of rows) {
      const covers = await d.getAllAsync<{ thumbnail: string }>(
        `SELECT thumbnail FROM playlist_tracks WHERE playlistId = ? AND thumbnail IS NOT NULL ORDER BY position LIMIT 4`,
        [r.id],
      );
      const c = await d.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM playlist_tracks WHERE playlistId = ?`,
        [r.id],
      );
      withCovers.push({
        id: r.id,
        name: r.name,
        covers: covers.map((x) => x.thumbnail),
        count: c?.n ?? 0,
        offline: !!r.offline,
      });
    }
    set({ playlists: withCovers });
  },
  isFavorite: (id) => get().favorites.some((t) => t.id === id),
  isDownloaded: (id) => get().downloads.some((t) => t.id === id),
  isPinned: (id) => get().pinned.some((t) => t.id === id),
}));

export async function initLibrary() {
  await getDb();
  await useLibrary.getState().refreshAll();
}
