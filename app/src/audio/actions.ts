/** Shared "play this list starting here" used by every screen. */
import type { Track } from '../api/client';
import { createPlaylist, pushHistory, setPlaylistTracks, useLibrary } from '../db/library';
import { loadQueue, setShuffle, usePlayer } from './player';

export async function playList(list: Track[], index: number) {
  if (!list.length) return;
  await loadQueue(list, index);
  const t = list[index];
  if (t) {
    await pushHistory(t);
    void useLibrary.getState().refreshAll();
  }
}

/** Turn shuffle on and play the list from a random track. */
export async function shufflePlay(list: Track[]) {
  if (!list.length) return;
  setShuffle(true);
  const start = Math.floor(Math.random() * list.length);
  await loadQueue(list, start);
  await pushHistory(list[start]);
  void useLibrary.getState().refreshAll();
}

/** Save the current play queue (in play order) as a new local playlist. */
export async function saveQueueAsPlaylist(name: string): Promise<number | null> {
  const { queue, order } = usePlayer.getState();
  const tracks = order.map((i) => queue[i]).filter(Boolean);
  if (!tracks.length) return null;
  const id = await createPlaylist(name.trim() || 'Saved Queue');
  await setPlaylistTracks(id, tracks);
  void useLibrary.getState().refreshAll();
  return id;
}
