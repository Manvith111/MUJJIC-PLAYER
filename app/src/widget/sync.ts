/**
 * Home-screen widget sync — NON-ANDROID no-op.
 *
 * The real implementation lives in `sync.android.ts`. Web and iOS get these stubs
 * so `player.ts` can import them unconditionally.
 */
import type { Track } from '../api/client';
import type { RepeatMode } from '../store/settings';

export type NowPlayingWidgetState = {
  id?: string;
  title?: string;
  artist?: string;
  thumbnail?: string | null;
  artworkUrl?: string;
  isPlaying: boolean;
  liked: boolean;
  repeat: RepeatMode;
  upNext: { id: string; title: string; artist: string }[];
  expanded: boolean;
};

export async function persistNowPlaying(_input: {
  current: Track | null;
  isPlaying: boolean;
  liked: boolean;
  repeat: RepeatMode;
  upNext: Track[];
}): Promise<void> {
  // no-op off Android
}

export async function readNowPlaying(): Promise<NowPlayingWidgetState | null> {
  return null;
}

export async function setWidgetExpanded(_expanded: boolean): Promise<void> {
  // no-op off Android
}

export async function setWidgetLiked(_liked: boolean): Promise<void> {
  // no-op off Android
}

export async function setWidgetRepeat(_repeat: RepeatMode): Promise<void> {
  // no-op off Android
}

export async function updateNowPlayingWidget(): Promise<void> {
  // no-op off Android
}
