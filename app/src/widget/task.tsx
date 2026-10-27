/**
 * Home-screen widget task handler (Android, headless).
 *
 * Runs when a widget is added/updated/resized or a control is tapped. Renders from
 * the persisted now-playing snapshot and forwards button taps to the running RNTP
 * player (its foreground service keeps the player alive during playback). LIKE and
 * LOOP also write through to SQLite favorites / persisted settings so the change
 * survives into the next app launch.
 */
import TrackPlayer, { RepeatMode } from '@rntp/player';
import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { toggleFavorite } from '../db/library';
import { useSettings, type RepeatMode as AppRepeat } from '../store/settings';
import { NowPlayingWidget } from './NowPlayingWidget';
import {
  readNowPlaying,
  setWidgetExpanded,
  setWidgetLiked,
  setWidgetRepeat,
  type NowPlayingWidgetState,
} from './sync.android';

const EMPTY: NowPlayingWidgetState = {
  isPlaying: false,
  liked: false,
  repeat: 'off',
  upNext: [],
  expanded: false,
};

const REPEAT_CYCLE: AppRepeat[] = ['off', 'all', 'one'];

function toRntpRepeat(r: AppRepeat): RepeatMode {
  return r === 'one' ? RepeatMode.One : r === 'all' ? RepeatMode.All : RepeatMode.Off;
}

function fromRntpRepeat(r: RepeatMode): AppRepeat {
  return r === RepeatMode.One ? 'one' : r === RepeatMode.All ? 'all' : 'off';
}

/** Toggle the current track's favorite flag and mirror it into the widget state. */
async function handleLike(s: NowPlayingWidgetState): Promise<void> {
  if (!s.id || !s.title) return;
  const liked = await toggleFavorite({
    id: s.id,
    title: s.title,
    artist: s.artist ?? '',
    thumbnail: s.thumbnail ?? null,
  });
  await setWidgetLiked(liked);
}

/** Cycle repeat off → all → one on the native player and persist it. */
async function handleLoop(s: NowPlayingWidgetState): Promise<void> {
  let current: AppRepeat = s.repeat;
  try {
    current = fromRntpRepeat(TrackPlayer.getRepeatMode());
  } catch {
    // player not set up — fall back to the last snapshot value
  }
  const next = REPEAT_CYCLE[(REPEAT_CYCLE.indexOf(current) + 1) % REPEAT_CYCLE.length];
  try {
    TrackPlayer.setRepeatMode(toRntpRepeat(next));
  } catch {
    // ignore if the player isn't alive; settings below still carry the choice
  }
  useSettings.getState().update({ repeat: next });
  await setWidgetRepeat(next);
}

export async function nowPlayingTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, clickAction, clickActionData, renderWidget } = props;

  if (widgetAction === 'WIDGET_CLICK') {
    const snapshot = (await readNowPlaying()) ?? EMPTY;
    try {
      switch (clickAction) {
        case 'LIKE':
          await handleLike(snapshot);
          break;
        case 'LOOP':
          await handleLoop(snapshot);
          break;
        case 'PLAY_PAUSE':
          if (TrackPlayer.isPlaying()) TrackPlayer.pause();
          else TrackPlayer.play();
          break;
        case 'NEXT':
          TrackPlayer.skipToNext();
          break;
        case 'PREV':
          TrackPlayer.skipToPrevious();
          break;
        case 'PLAY_OFFSET': {
          const active = TrackPlayer.getActiveMediaItemIndex();
          const offset = Number(clickActionData?.offset ?? 1);
          if (active != null) TrackPlayer.skipToIndex(active + offset);
          break;
        }
        case 'TOGGLE_QUEUE':
          await setWidgetExpanded(!snapshot.expanded);
          break;
      }
    } catch {
      // player not set up (cold start) — ignore; the tap is best-effort
    }
  }

  if (widgetAction === 'WIDGET_DELETED') return;

  const state = (await readNowPlaying()) ?? EMPTY;
  renderWidget(<NowPlayingWidget state={state} />);
}
