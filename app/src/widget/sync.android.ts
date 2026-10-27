/**
 * Home-screen widget sync (Android).
 *
 * Persists the current now-playing snapshot to AsyncStorage (so the widget task
 * can render even on a cold start) and pushes an update to any placed widget.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';

import type { Track } from '../api/client';
import type { RepeatMode } from '../store/settings';
import { baseUrlSync } from '../store/settings';
import { NowPlayingWidget, WIDGET_NAME } from './NowPlayingWidget';

const KEY = 'tm.widget.nowplaying.v1';

export type NowPlayingWidgetState = {
  id?: string;
  title?: string;
  artist?: string;
  thumbnail?: string | null; // raw thumbnail URL (for favoriting from the widget)
  artworkUrl?: string;
  isPlaying: boolean;
  liked: boolean;
  repeat: RepeatMode;
  upNext: { id: string; title: string; artist: string }[];
  expanded: boolean;
};

const EMPTY: NowPlayingWidgetState = {
  isPlaying: false,
  liked: false,
  repeat: 'off',
  upNext: [],
  expanded: false,
};

function artworkUrl(t: Track): string {
  return t.thumbnail ?? `${baseUrlSync()}/artwork/${t.id}`;
}

export async function readNowPlaying(): Promise<NowPlayingWidgetState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    // Merge over EMPTY so older snapshots missing `liked`/`repeat` stay valid.
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<NowPlayingWidgetState>) };
  } catch {
    return null;
  }
}

async function write(state: NowPlayingWidgetState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // best-effort
  }
}

export async function persistNowPlaying(input: {
  current: Track | null;
  isPlaying: boolean;
  liked: boolean;
  repeat: RepeatMode;
  upNext: Track[];
}): Promise<void> {
  const prev = await readNowPlaying();
  const state: NowPlayingWidgetState = {
    id: input.current?.id,
    title: input.current?.title,
    artist: input.current?.artist,
    thumbnail: input.current?.thumbnail ?? null,
    artworkUrl: input.current ? artworkUrl(input.current) : undefined,
    isPlaying: input.isPlaying,
    liked: input.liked,
    repeat: input.repeat,
    upNext: input.upNext.slice(0, 5).map((t) => ({ id: t.id, title: t.title, artist: t.artist })),
    expanded: prev?.expanded ?? false,
  };
  await write(state);
}

export async function setWidgetExpanded(expanded: boolean): Promise<void> {
  const prev = (await readNowPlaying()) ?? EMPTY;
  await write({ ...prev, expanded });
}

export async function setWidgetLiked(liked: boolean): Promise<void> {
  const prev = (await readNowPlaying()) ?? EMPTY;
  await write({ ...prev, liked });
}

export async function setWidgetRepeat(repeat: RepeatMode): Promise<void> {
  const prev = (await readNowPlaying()) ?? EMPTY;
  await write({ ...prev, repeat });
}

export async function updateNowPlayingWidget(): Promise<void> {
  const state = (await readNowPlaying()) ?? EMPTY;
  try {
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => React.createElement(NowPlayingWidget, { state }),
      widgetNotFound: () => {},
    });
  } catch {
    // no widget placed / update failed — ignore
  }
}
