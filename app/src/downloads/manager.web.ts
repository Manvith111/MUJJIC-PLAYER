/**
 * Web-only stub for the downloads manager (native uses expo-file-system). On web
 * there's no offline file storage, so "download" registers the track in the
 * in-memory library and is a no-op for actual files. Keeps the web bundle clean.
 */
import { create } from 'zustand';

import type { Track } from '../api/client';
import { registerDownload, removeDownloadRow, useLibrary } from '../db/library';

type DownloadStore = { active: Record<string, boolean>; error: Record<string, string> };

export const useDownloads = create<DownloadStore>(() => ({ active: {}, error: {} }));

export type DownloadOptions = { folder?: string | null; silentToast?: boolean };

export async function downloadTrack(track: Track, _opts: DownloadOptions = {}): Promise<Track | null> {
  await registerDownload(track, '');
  await useLibrary.getState().refreshDownloads();
  return track;
}

export async function downloadTracks(
  tracks: Track[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  for (let i = 0; i < tracks.length; i++) {
    await downloadTrack(tracks[i]);
    ok += 1;
    onProgress?.(i + 1, tracks.length);
  }
  return { ok, failed: 0 };
}

export async function deleteDownload(id: string): Promise<void> {
  await removeDownloadRow(id);
  await useLibrary.getState().refreshDownloads();
}

/** No Storage Access Framework on web — folder saving isn't available in the browser. */
export async function pickDownloadFolder(): Promise<boolean> {
  return false;
}
