/**
 * Download tracks for offline playback, and (on Android) also write a copy into a
 * user-picked folder via the Storage Access Framework so the file is visible to
 * the phone's file manager and other music apps.
 *
 * Two copies exist by design:
 *  • app sandbox (<documents>/downloads/<id>.m4a) → guaranteed in-app offline playback
 *  • the user's chosen folder (SAF) → readable by every other app
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import { create } from 'zustand';
import { Platform, ToastAndroid } from 'react-native';

import { api, type Track } from '../api/client';
import { registerDownload, removeDownloadRow, useLibrary } from '../db/library';
import { useSettings } from '../store/settings';

const { StorageAccessFramework: SAF, EncodingType } = LegacyFS;

function toast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
}

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'track';
}

/** Return the saved folder URI, asking the user to pick one the first time. */
async function ensureDownloadFolder(prompt: boolean): Promise<string | null> {
  const existing = useSettings.getState().downloadFolderUri;
  if (existing) return existing;
  if (!prompt) return null;
  const perm = await SAF.requestDirectoryPermissionsAsync();
  if (!perm.granted) return null;
  useSettings.getState().update({ downloadFolderUri: perm.directoryUri });
  return perm.directoryUri;
}

/** Let the user (re)choose the download folder from Settings. */
export async function pickDownloadFolder(): Promise<boolean> {
  const perm = await SAF.requestDirectoryPermissionsAsync();
  if (!perm.granted) return false;
  useSettings.getState().update({ downloadFolderUri: perm.directoryUri });
  return true;
}

/**
 * Copy an already-downloaded file into the user's chosen folder (SAF).
 *
 * `folder` controls prompting:
 *   • undefined → resolve the saved folder, asking the user the first time
 *   • a string  → use that folder without prompting (batch: ask once up front)
 *   • null      → skip folder saving entirely (offline-only), no prompt / toast
 */
async function saveToFolder(localUri: string, track: Track, folder?: string | null): Promise<void> {
  if (folder === null) return; // explicitly offline-only
  try {
    const target = folder ?? (await ensureDownloadFolder(true));
    if (!target) {
      toast('Saved offline only — pick a folder in Settings to save to your phone');
      return;
    }
    const fileName = sanitize(`${track.artist} - ${track.title}`);
    const safUri = await SAF.createFileAsync(target, fileName, 'audio/mp4');
    const b64 = await LegacyFS.readAsStringAsync(localUri, { encoding: EncodingType.Base64 });
    await LegacyFS.writeAsStringAsync(safUri, b64, { encoding: EncodingType.Base64 });
  } catch {
    // Folder permission likely lost/revoked — clear it so we re-ask next time.
    useSettings.getState().update({ downloadFolderUri: null });
  }
}

function downloadsDir(): Directory {
  const dir = new Directory(Paths.document, 'downloads');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Ensure the freshly-downloaded file is named `<id>.m4a` so lookups-by-id resolve. */
function normalizeName(downloaded: File, dir: Directory, id: string): string {
  const want = new File(dir, `${id}.m4a`);
  if (downloaded.uri === want.uri) return downloaded.uri;
  try {
    if (want.exists) want.delete();
    downloaded.move(want);
    return want.uri;
  } catch {
    return downloaded.uri; // keep whatever name we got; DB stores the real uri
  }
}

type DownloadStore = {
  active: Record<string, boolean>; // videoId -> in progress
  error: Record<string, string>;
};

export const useDownloads = create<DownloadStore>(() => ({ active: {}, error: {} }));

export type DownloadOptions = {
  /** Folder override for the SAF copy (see saveToFolder). */
  folder?: string | null;
  /** Suppress per-track toasts (batch downloads show one summary instead). */
  silentToast?: boolean;
};

export async function downloadTrack(track: Track, opts: DownloadOptions = {}): Promise<Track | null> {
  const id = track.id;
  if (useDownloads.getState().active[id]) return null;
  useDownloads.setState((s) => ({ active: { ...s.active, [id]: true }, error: omit(s.error, id) }));
  try {
    const url = await api.downloadUrl(id);
    const dir = downloadsDir();
    // Clear any stale copy so the download never trips the "already exists" guard.
    const existing = new File(dir, `${id}.m4a`);
    if (existing.exists) existing.delete();
    // SDK 57: download INTO the directory (the server's Content-Disposition names
    // the file `<id>.m4a`); normalize the name defensively just in case.
    const downloaded = await File.downloadFileAsync(url, dir);
    const finalUri = normalizeName(downloaded, dir, id);
    await registerDownload(track, finalUri);
    await useLibrary.getState().refreshDownloads();
    await saveToFolder(finalUri, track, opts.folder); // also drop a copy into the user's folder
    return { ...track, localUri: finalUri };
  } catch (e: any) {
    useDownloads.setState((s) => ({ error: { ...s.error, [id]: String(e?.message ?? e) } }));
    if (!opts.silentToast) toast('Download failed');
    return null;
  } finally {
    useDownloads.setState((s) => ({ active: omit(s.active, id) }));
  }
}

/**
 * Download many tracks (whole playlist/album). Asks for the save folder ONCE up
 * front, keeps going past individual failures, and reports a single summary.
 */
export async function downloadTracks(
  tracks: Track[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: number; failed: number }> {
  const total = tracks.length;
  if (!total) return { ok: 0, failed: 0 };
  // Resolve the SAF folder once; null = decline → offline-only for the whole batch.
  const folder = await ensureDownloadFolder(true);
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < total; i++) {
    const res = await downloadTrack(tracks[i], { folder, silentToast: true });
    if (res) ok += 1;
    else failed += 1;
    onProgress?.(i + 1, total);
  }
  toast(failed ? `Downloaded ${ok}/${total} — ${failed} failed` : `Downloaded ${ok} song${ok === 1 ? '' : 's'}`);
  return { ok, failed };
}

export async function deleteDownload(id: string): Promise<void> {
  try {
    const file = new File(downloadsDir(), `${id}.m4a`);
    if (file.exists) file.delete();
  } catch {
    // ignore fs errors; still drop the DB row
  }
  await removeDownloadRow(id);
  await useLibrary.getState().refreshDownloads();
}

function omit<T extends Record<string, any>>(obj: T, key: string): T {
  const { [key]: _, ...rest } = obj;
  return rest as T;
}
