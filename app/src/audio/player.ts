/**
 * Playback engine + queue, built on react-native-track-player V5 (`@rntp/player`).
 *
 * RNTP owns the native queue and the media notification / lock screen (artwork,
 * title/artist, play/pause/next/previous/seek) via a foreground service. This
 * module is an *adapter*: it keeps the exact `usePlayer` zustand store shape and
 * the same exported functions the UI already uses, and mirrors every queue
 * mutation into RNTP so the lock-screen and home-screen widget controls work.
 *
 * Queue model (unchanged from the old expo-audio engine so the UI is untouched):
 *   - `queue`     tracks in their original insertion order
 *   - `order`     play order as indices into `queue` (identity unless shuffled)
 *   - `orderPos`  position within `order` of the current track
 * RNTP's native queue is built in play order, so RNTP's active index === orderPos.
 */
import TrackPlayer, {
  Event,
  PlaybackState,
  PlayerCommand,
  RepeatMode,
  type MediaItem,
} from '@rntp/player';
import { create } from 'zustand';

import { api, type Track } from '../api/client';
import { getBaseUrl } from '../store/settings';
import { getDownload, useLibrary } from '../db/library';
import { useSettings, type RepeatMode as AppRepeat } from '../store/settings';
import { persistNowPlaying, updateNowPlayingWidget } from '../widget/sync';

type AbLoop = { a: number | null; b: number | null };

type PlayerState = {
  ready: boolean;
  queue: Track[];
  order: number[]; // playback order as indices into queue
  orderPos: number; // position within `order`
  current: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number; // seconds
  duration: number; // seconds
  repeat: AppRepeat;
  shuffle: boolean;
  autoplay: boolean;
  muted: boolean;
  volume: number;
  ab: AbLoop;
  loadingRecs: boolean;
  peeking: boolean; // a "peek" track is playing over a held queue
  peekTrack: Track | null;
};

// Snapshot of the real queue while a peek track plays on top of it.
type PeekSnapshot = {
  queue: Track[];
  order: number[];
  orderPos: number;
  position: number;
  wasPlaying: boolean;
};
let peekSnapshot: PeekSnapshot | null = null;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a play order over queue indices, keeping `keepIndex` first when shuffling. */
function buildOrder(len: number, shuffle: boolean, keepIndex = 0): { order: number[]; pos: number } {
  const idx = Array.from({ length: len }, (_, i) => i);
  if (!shuffle) return { order: idx, pos: keepIndex };
  const rest = shuffled(idx.filter((i) => i !== keepIndex));
  const order = keepIndex >= 0 && keepIndex < len ? [keepIndex, ...rest] : shuffled(idx);
  return { order, pos: 0 };
}

export const usePlayer = create<PlayerState>(() => ({
  ready: false,
  queue: [],
  order: [],
  orderPos: 0,
  current: null,
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  repeat: 'off',
  shuffle: false,
  autoplay: true,
  muted: false,
  volume: 1,
  ab: { a: null, b: null },
  loadingRecs: false,
  peeking: false,
  peekTrack: null,
}));

const set = usePlayer.setState;
const get = usePlayer.getState;

// ---- RNTP <-> app mappings -------------------------------------------------

function toRntpRepeat(r: AppRepeat): RepeatMode {
  return r === 'one' ? RepeatMode.One : r === 'all' ? RepeatMode.All : RepeatMode.Off;
}

/** Resolve a Track into an RNTP MediaItem. Prefers an offline download, else the
 *  backend stream proxy (a stable, non-expiring URL). */
async function toItem(track: Track, base: string): Promise<MediaItem> {
  let uri = track.localUri ?? undefined;
  if (!uri) {
    try {
      const dl = await getDownload(track.id);
      if (dl?.localUri) uri = dl.localUri;
    } catch {
      // ignore; fall back to streaming
    }
  }
  if (!uri) uri = `${base}/stream/${track.id}`;
  const artwork = track.thumbnail ?? `${base}/artwork/${track.id}`;
  return {
    mediaId: track.id,
    url: uri,
    title: track.title,
    artist: track.artist,
    albumTitle: track.album ?? undefined,
    artworkUrl: artwork,
    duration: track.duration ?? undefined,
    extras: { id: track.id },
  };
}

async function toItems(tracks: Track[]): Promise<MediaItem[]> {
  const base = await getBaseUrl();
  return Promise.all(tracks.map((t) => toItem(t, base)));
}

/** Tracks that make up the current play order, in play order. */
function orderedTracks(): Track[] {
  const st = get();
  return st.order.map((i) => st.queue[i]).filter(Boolean);
}

// ---- init + event wiring ---------------------------------------------------

/** Initialize the native player + adopt persisted preferences. Call once at startup. */
export async function initAudio() {
  if (get().ready) return;
  try {
    TrackPlayer.setupPlayer({ autoUpdateMetadataFromStream: false });
  } catch {
    // Already set up (e.g. Fast Refresh re-ran this) — safe to continue.
  }
  // Native handling: the lock-screen / notification buttons drive RNTP directly
  // (reliable even when JS is asleep); we observe the resulting playback events.
  TrackPlayer.setCommands({
    capabilities: [
      PlayerCommand.PlayPause,
      PlayerCommand.Next,
      PlayerCommand.Previous,
      PlayerCommand.Seek,
      PlayerCommand.Stop,
      PlayerCommand.SkipForward,
      PlayerCommand.SkipBackward,
    ],
    handling: 'native',
    forwardInterval: 10,
    backwardInterval: 10,
  });

  const s = useSettings.getState();
  TrackPlayer.setRepeatMode(toRntpRepeat(s.repeat));
  TrackPlayer.setVolume(s.volume);
  attachListeners();
  set({
    ready: true,
    repeat: s.repeat,
    shuffle: s.shuffle,
    autoplay: s.autoplay,
    volume: s.volume,
  });
}

function attachListeners() {
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
    const st = get();
    // A-B loop takes priority: bounce back to A when passing B.
    if (st.ab.a != null && st.ab.b != null && e.position >= st.ab.b) {
      TrackPlayer.seekTo(st.ab.a);
      return;
    }
    set({ position: e.position ?? 0, duration: e.duration || st.duration });
  });

  TrackPlayer.addEventListener(Event.IsPlayingChanged, (e) => {
    set({ isPlaying: !!e.playing });
    void updateNowPlayingWidget();
  });

  TrackPlayer.addEventListener(Event.PlaybackStateChanged, (e) => {
    set({ isBuffering: e.state === PlaybackState.Buffering });
    if (e.state === PlaybackState.Ended) void handleEnded();
  });

  TrackPlayer.addEventListener(Event.MediaItemTransition, (e) => {
    if (get().peeking) return; // peek is a single throwaway item; ignore index moves
    if (e.index == null) return;
    const st = get();
    const track = st.queue[st.order[e.index]] ?? null;
    set({ orderPos: e.index, current: track, position: 0, duration: track?.duration ?? 0 });
    void syncWidget();
    // Proactively extend an autoplay queue so the next track is ready before this
    // one ends (seamless radio), mirroring the old expo-audio behaviour.
    if (st.autoplay && st.repeat === 'off' && e.index >= st.order.length - 1) {
      void appendRecommendations();
    }
  });
}

async function syncWidget() {
  const st = get();
  const liked = st.current ? useLibrary.getState().isFavorite(st.current.id) : false;
  await persistNowPlaying({
    current: st.current,
    isPlaying: st.isPlaying,
    liked,
    repeat: st.repeat,
    upNext: st.order.slice(st.orderPos + 1, st.orderPos + 6).map((i) => st.queue[i]).filter(Boolean),
  });
  void updateNowPlayingWidget();
}

/** Queue exhausted with repeat off: append radio and continue, else stop. */
async function handleEnded() {
  if (get().peeking) {
    await exitPeek();
    return;
  }
  const st = get();
  if (st.autoplay && st.repeat === 'off') {
    const added = await appendRecommendations();
    if (added) TrackPlayer.play();
  }
}

// ---- queue loading ---------------------------------------------------------

/** Load a fresh queue and start at startIndex. */
export async function loadQueue(tracks: Track[], startIndex = 0) {
  if (!tracks.length) return;
  const { shuffle } = get();
  const { order, pos } = buildOrder(tracks.length, shuffle, startIndex);
  set({
    queue: tracks,
    order,
    orderPos: pos,
    ab: { a: null, b: null },
    current: tracks[order[pos]] ?? null,
    position: 0,
    duration: tracks[order[pos]]?.duration ?? 0,
    peeking: false,
    peekTrack: null,
  });
  const items = await toItems(order.map((i) => tracks[i]));
  TrackPlayer.setMediaItems(items, pos);
  TrackPlayer.play();
  void syncWidget();
}

/** Play a single track immediately as a one-item queue. */
export async function playTrack(track: Track) {
  await loadQueue([track], 0);
}

/** Fetch radio for the current track and append to the queue + order + RNTP. */
async function appendRecommendations(): Promise<boolean> {
  const st = get();
  const seed = st.current;
  if (!seed || st.loadingRecs) return false;
  set({ loadingRecs: true });
  try {
    const recs = await api.recommend(seed.id, 25);
    const existing = new Set(st.queue.map((t) => t.id));
    const fresh = recs.filter((t) => !existing.has(t.id));
    if (!fresh.length) return false;
    const newQueue = [...st.queue, ...fresh];
    const newIndices = fresh.map((_, i) => st.queue.length + i);
    const appended = st.shuffle ? shuffled(newIndices) : newIndices;
    set({ queue: newQueue, order: [...st.order, ...appended] });
    const items = await toItems(appended.map((i) => newQueue[i]));
    TrackPlayer.addMediaItems(items);
    void syncWidget();
    return true;
  } catch {
    return false;
  } finally {
    set({ loadingRecs: false });
  }
}

// ---- transport -------------------------------------------------------------

export function togglePlay() {
  if (get().isPlaying) TrackPlayer.pause();
  else TrackPlayer.play();
}

export const next = () => {
  TrackPlayer.skipToNext();
  return Promise.resolve();
};

export const previous = () => {
  // Standard behavior: restart current track if past 3s, else go back.
  if (get().position > 3) {
    TrackPlayer.seekTo(0);
    return Promise.resolve();
  }
  TrackPlayer.skipToPrevious();
  return Promise.resolve();
};

/** Move within the play order (used by gestures / programmatic skips). */
export async function advance(delta: number) {
  if (delta >= 0) TrackPlayer.skipToNext();
  else TrackPlayer.skipToPrevious();
}

export function seekTo(sec: number) {
  const clamped = Math.max(0, Math.min(sec, get().duration || sec));
  TrackPlayer.seekTo(clamped);
  set({ position: clamped });
}

export function seekBy(delta: number) {
  seekTo(get().position + delta);
}

export function setVolume(v: number) {
  const vol = Math.max(0, Math.min(1, v));
  set({ volume: vol, muted: false });
  TrackPlayer.setVolume(vol);
  useSettings.getState().update({ volume: vol });
}

export function toggleMute() {
  const muted = !get().muted;
  set({ muted });
  TrackPlayer.setVolume(muted ? 0 : get().volume);
}

export function cycleRepeat() {
  const order: AppRepeat[] = ['off', 'all', 'one'];
  const nextMode = order[(order.indexOf(get().repeat) + 1) % order.length];
  set({ repeat: nextMode });
  TrackPlayer.setRepeatMode(toRntpRepeat(nextMode));
  useSettings.getState().update({ repeat: nextMode });
}

export function setShuffle(on: boolean) {
  if (get().shuffle === on) return;
  toggleShuffle();
}

export async function toggleShuffle() {
  const shuffle = !get().shuffle;
  const st = get();
  // Reshuffle ONLY the upcoming items — keep history + current (and orderPos) in
  // place so the store stays aligned with RNTP's active index (no desync/restart).
  const head = st.order.slice(0, st.orderPos + 1);
  const tail = st.order.slice(st.orderPos + 1);
  const newTail = shuffle ? shuffled(tail) : [...tail].sort((a, b) => a - b);
  const order = [...head, ...newTail];
  set({ shuffle, order });
  useSettings.getState().update({ shuffle });
  // Mirror into RNTP: replace everything after the currently-playing item.
  const activeIndex = TrackPlayer.getActiveMediaItemIndex();
  if (activeIndex != null) {
    const queueLen = TrackPlayer.getQueue().length;
    if (queueLen > activeIndex + 1) TrackPlayer.removeMediaItems(activeIndex + 1, queueLen);
    if (newTail.length) TrackPlayer.addMediaItems(await toItems(newTail.map((i) => st.queue[i])));
  }
  void syncWidget();
}

export function toggleAutoplay() {
  const autoplay = !get().autoplay;
  set({ autoplay });
  useSettings.getState().update({ autoplay });
}

// ---- A-B loop --------------------------------------------------------------

export function setAbPoint() {
  const st = get();
  if (st.ab.a == null) set({ ab: { a: st.position, b: null } });
  else if (st.ab.b == null) set({ ab: { a: st.ab.a, b: st.position } });
  else set({ ab: { a: null, b: null } }); // third press clears
}

export function clearAb() {
  set({ ab: { a: null, b: null } });
}

// ---- queue editing ---------------------------------------------------------

/** Insert a track right after the current one (Play Next). */
export function insertNext(track: Track) {
  const st = get();
  if (!st.queue.length) {
    void loadQueue([track], 0);
    return;
  }
  const qIndex = st.queue.length;
  const order = [...st.order];
  order.splice(st.orderPos + 1, 0, qIndex);
  set({ queue: [...st.queue, track], order });
  void toItems([track]).then((items) => {
    const active = TrackPlayer.getActiveMediaItemIndex() ?? st.orderPos;
    TrackPlayer.insertMediaItems(active + 1, items);
    void syncWidget();
  });
}

/** Append tracks to the end of the current queue (Add to Queue). */
export function enqueue(tracks: Track[]) {
  const st = get();
  const existing = new Set(st.queue.map((t) => t.id));
  const fresh = tracks.filter((t) => !existing.has(t.id));
  if (!fresh.length) return;
  const newQueue = [...st.queue, ...fresh];
  const newIndices = fresh.map((_, i) => st.queue.length + i);
  const appended = st.shuffle ? shuffled(newIndices) : newIndices;
  set({ queue: newQueue, order: [...st.order, ...appended] });
  void toItems(appended.map((i) => newQueue[i])).then((items) => {
    TrackPlayer.addMediaItems(items);
    void syncWidget();
  });
}

/** Reorder an Up Next item (index within the up-next list, i.e. after current). */
export function moveUpNext(upNextIndex: number, dir: -1 | 1) {
  const st = get();
  const a = st.orderPos + 1 + upNextIndex;
  const b = a + dir;
  if (a < st.orderPos + 1 || a >= st.order.length) return;
  if (b < st.orderPos + 1 || b >= st.order.length) return;
  const order = [...st.order];
  [order[a], order[b]] = [order[b], order[a]];
  set({ order });
  TrackPlayer.moveMediaItem(a, b);
  void syncWidget();
}

/** Remove an Up Next item from the queue. */
export function removeUpNext(upNextIndex: number) {
  const st = get();
  const pos = st.orderPos + 1 + upNextIndex;
  if (pos <= st.orderPos || pos >= st.order.length) return;
  const order = [...st.order];
  order.splice(pos, 1);
  set({ order });
  TrackPlayer.removeMediaItem(pos);
  void syncWidget();
}

/** Remove a queue item by its position within the full order. */
export function removeAtOrderPos(pos: number) {
  const st = get();
  if (pos < 0 || pos >= st.order.length || pos === st.orderPos) return;
  const order = [...st.order];
  order.splice(pos, 1);
  const orderPos = pos < st.orderPos ? st.orderPos - 1 : st.orderPos;
  set({ order, orderPos });
  TrackPlayer.removeMediaItem(pos);
  void syncWidget();
}

/** Replace the whole play order (from drag-reorder of the full queue). */
export function setQueueOrder(newOrder: number[]) {
  const st = get();
  const currentQI = st.order[st.orderPos];
  const orderPos = Math.max(0, newOrder.indexOf(currentQI));
  set({ order: newOrder, orderPos });
  // Full rebuild; preserve the current track's playback position.
  const savedPos = st.position;
  const wasPlaying = st.isPlaying;
  void toItems(newOrder.map((i) => st.queue[i])).then((items) => {
    TrackPlayer.setMediaItems(items, orderPos);
    TrackPlayer.seekTo(savedPos);
    if (wasPlaying) TrackPlayer.play();
    void syncWidget();
  });
}

/** Append more tracks (radio of the current song) — "load more" at the queue's end. */
export async function loadMoreQueue(): Promise<boolean> {
  return appendRecommendations();
}

/** Jump directly to a queue item (from the Queue view). */
export async function jumpTo(queueIndex: number) {
  const st = get();
  const pos = st.order.indexOf(queueIndex);
  if (pos < 0) return;
  set({ orderPos: pos, current: st.queue[queueIndex] ?? st.current });
  TrackPlayer.skipToIndex(pos);
}

// ---- peek (play a song without disturbing the queue) -----------------------

/** Play `track` on top of the current queue; the queue + position are held and
 *  restored when the peek track finishes or `exitPeek()` is called. */
export async function peekPlay(track: Track) {
  const st = get();
  if (st.peeking) {
    // already peeking — just swap the peek track
    await exitPeek(/*silent*/ true);
  }
  const cur = get();
  peekSnapshot = {
    queue: cur.queue,
    order: cur.order,
    orderPos: cur.orderPos,
    position: cur.position,
    wasPlaying: cur.isPlaying,
  };
  set({ peeking: true, peekTrack: track, current: track, position: 0, duration: track.duration ?? 0 });
  const items = await toItems([track]);
  TrackPlayer.setMediaItems(items, 0);
  TrackPlayer.play();
  void syncWidget();
}

/** Restore the held queue after a peek. */
export async function exitPeek(silent = false) {
  const snap = peekSnapshot;
  if (!snap) {
    set({ peeking: false, peekTrack: null });
    return;
  }
  peekSnapshot = null;
  set({
    peeking: false,
    peekTrack: null,
    queue: snap.queue,
    order: snap.order,
    orderPos: snap.orderPos,
    current: snap.queue[snap.order[snap.orderPos]] ?? null,
  });
  const items = await toItems(snap.order.map((i) => snap.queue[i]));
  TrackPlayer.setMediaItems(items, snap.orderPos);
  TrackPlayer.seekTo(snap.position);
  if (!silent && snap.wasPlaying) TrackPlayer.play();
  else TrackPlayer.pause();
  void syncWidget();
}

export function teardown() {
  try {
    TrackPlayer.destroy();
  } catch {
    // best-effort
  }
  set({ ready: false });
}
