/**
 * WEB playback engine + queue, built on expo-audio.
 *
 * The native app (`player.ts`) uses react-native-track-player for lock-screen /
 * widget controls, which don't exist on the web. On web we keep the simpler
 * expo-audio engine. Both files expose the *same* `usePlayer` store shape and the
 * same exported functions so every screen works identically on both platforms.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { create } from 'zustand';

import { api, type Track } from '../api/client';
import { getDownload } from '../db/library';
import { useSettings, type RepeatMode } from '../store/settings';

type AbLoop = { a: number | null; b: number | null };

type PlayerState = {
  ready: boolean;
  queue: Track[];
  order: number[];
  orderPos: number;
  current: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;
  autoplay: boolean;
  muted: boolean;
  volume: number;
  ab: AbLoop;
  loadingRecs: boolean;
  peeking: boolean;
  peekTrack: Track | null;
};

type PeekSnapshot = { queue: Track[]; order: number[]; orderPos: number; position: number; wasPlaying: boolean };
let peekSnapshot: PeekSnapshot | null = null;

let player: AudioPlayer | null = null;
let advancing = false;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

export async function initAudio() {
  if (get().ready) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
  });
  const s = useSettings.getState();
  set({ ready: true, repeat: s.repeat, shuffle: s.shuffle, autoplay: s.autoplay, volume: s.volume });
}

function ensurePlayer(uri: string): AudioPlayer {
  if (!player) {
    player = createAudioPlayer({ uri });
    player.addListener('playbackStatusUpdate', onStatus);
  } else {
    player.replace({ uri });
  }
  return player;
}

function onStatus(status: any) {
  const st = get();
  if (st.ab.a != null && st.ab.b != null && status.currentTime >= st.ab.b) {
    player?.seekTo(st.ab.a);
    return;
  }
  set({
    position: status.currentTime ?? 0,
    duration: status.duration ?? st.duration,
    isPlaying: !!status.playing,
    isBuffering: !!status.isBuffering,
  });
  if (status.didJustFinish) void handleTrackEnd();
}

async function handleTrackEnd() {
  if (advancing) return;
  advancing = true;
  try {
    const st = get();
    if (st.peeking) {
      await exitPeek();
      return;
    }
    if (st.repeat === 'one') {
      await player?.seekTo(0);
      player?.play();
      return;
    }
    await advance(1, true);
  } finally {
    advancing = false;
  }
}

export async function loadQueue(tracks: Track[], startIndex = 0) {
  if (!tracks.length) return;
  const { shuffle } = get();
  const { order, pos } = buildOrder(tracks.length, shuffle, startIndex);
  set({ queue: tracks, order, orderPos: pos, ab: { a: null, b: null }, peeking: false, peekTrack: null });
  await playAt(order[pos]);
}

export async function playTrack(track: Track) {
  await loadQueue([track], 0);
}

async function resolveUri(track: Track): Promise<string> {
  let uri = track.localUri ?? undefined;
  if (!uri) {
    try {
      const dl = await getDownload(track.id);
      if (dl?.localUri) uri = dl.localUri;
    } catch {
      // ignore
    }
  }
  if (!uri) uri = await api.streamUrl(track.id);
  return uri;
}

async function playAt(queueIndex: number) {
  const st = get();
  const track = st.queue[queueIndex];
  if (!track) return;
  set({ current: track, position: 0, duration: track.duration ?? 0 });
  const uri = await resolveUri(track);
  const p = ensurePlayer(uri);
  p.volume = st.muted ? 0 : st.volume;
  p.play();
}

export async function advance(delta: number, auto = false) {
  const st = get();
  if (!st.order.length) return;
  let pos = st.orderPos + delta;
  if (pos >= st.order.length) {
    if (st.repeat === 'all') pos = 0;
    else if (auto && st.autoplay) {
      const added = await appendRecommendations();
      if (added) pos = st.orderPos + 1;
      else {
        player?.pause();
        return;
      }
    } else {
      player?.pause();
      return;
    }
  } else if (pos < 0) {
    pos = st.repeat === 'all' ? st.order.length - 1 : 0;
  }
  const fresh = get();
  set({ orderPos: pos });
  await playAt(fresh.order[pos]);
}

async function appendRecommendations(): Promise<boolean> {
  const st = get();
  const seed = st.current;
  if (!seed) return false;
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
    return true;
  } catch {
    return false;
  } finally {
    set({ loadingRecs: false });
  }
}

export function togglePlay() {
  const p = player;
  if (!p) return;
  if (get().isPlaying) p.pause();
  else p.play();
}

export const next = () => advance(1);
export const previous = () => {
  if (get().position > 3) {
    player?.seekTo(0);
    return Promise.resolve();
  }
  return advance(-1);
};

export function seekTo(sec: number) {
  const clamped = Math.max(0, Math.min(sec, get().duration || sec));
  player?.seekTo(clamped);
  set({ position: clamped });
}

export function seekBy(delta: number) {
  seekTo(get().position + delta);
}

export function setVolume(v: number) {
  const vol = Math.max(0, Math.min(1, v));
  set({ volume: vol, muted: false });
  if (player) player.volume = vol;
  useSettings.getState().update({ volume: vol });
}

export function toggleMute() {
  const muted = !get().muted;
  set({ muted });
  if (player) player.volume = muted ? 0 : get().volume;
}

export function cycleRepeat() {
  const order: RepeatMode[] = ['off', 'all', 'one'];
  const nextMode = order[(order.indexOf(get().repeat) + 1) % order.length];
  set({ repeat: nextMode });
  useSettings.getState().update({ repeat: nextMode });
}

export function setShuffle(on: boolean) {
  if (get().shuffle === on) return;
  toggleShuffle();
}

export function toggleShuffle() {
  const shuffle = !get().shuffle;
  const st = get();
  // Reshuffle only the upcoming items; keep history + current in place.
  const head = st.order.slice(0, st.orderPos + 1);
  const tail = st.order.slice(st.orderPos + 1);
  const newTail = shuffle ? shuffled(tail) : [...tail].sort((a, b) => a - b);
  set({ shuffle, order: [...head, ...newTail] });
  useSettings.getState().update({ shuffle });
}

export function toggleAutoplay() {
  const autoplay = !get().autoplay;
  set({ autoplay });
  useSettings.getState().update({ autoplay });
}

export function setAbPoint() {
  const st = get();
  if (st.ab.a == null) set({ ab: { a: st.position, b: null } });
  else if (st.ab.b == null) set({ ab: { a: st.ab.a, b: st.position } });
  else set({ ab: { a: null, b: null } });
}

export function clearAb() {
  set({ ab: { a: null, b: null } });
}

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
}

export function enqueue(tracks: Track[]) {
  const st = get();
  const existing = new Set(st.queue.map((t) => t.id));
  const fresh = tracks.filter((t) => !existing.has(t.id));
  if (!fresh.length) return;
  const newQueue = [...st.queue, ...fresh];
  const newIndices = fresh.map((_, i) => st.queue.length + i);
  set({ queue: newQueue, order: [...st.order, ...(st.shuffle ? shuffled(newIndices) : newIndices)] });
}

export function moveUpNext(upNextIndex: number, dir: -1 | 1) {
  const st = get();
  const a = st.orderPos + 1 + upNextIndex;
  const b = a + dir;
  if (a < st.orderPos + 1 || a >= st.order.length) return;
  if (b < st.orderPos + 1 || b >= st.order.length) return;
  const order = [...st.order];
  [order[a], order[b]] = [order[b], order[a]];
  set({ order });
}

export function removeUpNext(upNextIndex: number) {
  const st = get();
  const pos = st.orderPos + 1 + upNextIndex;
  if (pos <= st.orderPos || pos >= st.order.length) return;
  const order = [...st.order];
  order.splice(pos, 1);
  set({ order });
}

export function removeAtOrderPos(pos: number) {
  const st = get();
  if (pos < 0 || pos >= st.order.length || pos === st.orderPos) return;
  const order = [...st.order];
  order.splice(pos, 1);
  const orderPos = pos < st.orderPos ? st.orderPos - 1 : st.orderPos;
  set({ order, orderPos });
}

export function setQueueOrder(newOrder: number[]) {
  const st = get();
  const currentQI = st.order[st.orderPos];
  const orderPos = Math.max(0, newOrder.indexOf(currentQI));
  set({ order: newOrder, orderPos });
}

export async function loadMoreQueue(): Promise<boolean> {
  return appendRecommendations();
}

export async function jumpTo(queueIndex: number) {
  const st = get();
  const pos = st.order.indexOf(queueIndex);
  if (pos < 0) return;
  set({ orderPos: pos });
  await playAt(queueIndex);
}

/** Play a song on top of the held queue; restore on finish / exitPeek. */
export async function peekPlay(track: Track) {
  const st = get();
  peekSnapshot = { queue: st.queue, order: st.order, orderPos: st.orderPos, position: st.position, wasPlaying: st.isPlaying };
  set({ peeking: true, peekTrack: track, current: track, position: 0, duration: track.duration ?? 0 });
  const uri = await resolveUri(track);
  const p = ensurePlayer(uri);
  p.volume = st.muted ? 0 : st.volume;
  p.play();
}

export async function exitPeek() {
  const snap = peekSnapshot;
  set({ peeking: false, peekTrack: null });
  if (!snap) return;
  peekSnapshot = null;
  set({ queue: snap.queue, order: snap.order, orderPos: snap.orderPos });
  const track = snap.queue[snap.order[snap.orderPos]];
  if (!track) return;
  set({ current: track });
  const uri = await resolveUri(track);
  const p = ensurePlayer(uri);
  await p.seekTo(snap.position);
  if (snap.wasPlaying) p.play();
  else p.pause();
}

export function teardown() {
  player?.remove();
  player = null;
  set({ ready: false });
}
