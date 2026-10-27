/**
 * Home-screen "Now Playing" widget layout.
 *
 * Rendered by `sync.android.ts` (requestWidgetUpdate) and by the widget task
 * handler. Controls emit clickActions handled in `task.tsx`:
 *   OPEN_APP · LIKE · PREV · PLAY_PAUSE · NEXT · LOOP · TOGGLE_QUEUE · PLAY_OFFSET{offset}
 */
import React from 'react';
import { FlexWidget, ImageWidget, ListWidget, TextWidget, type ImageWidgetSource } from 'react-native-android-widget';

import type { NowPlayingWidgetState } from './sync.android';

export const WIDGET_NAME = 'NowPlaying';

const C = {
  bg: '#0b0e14',
  panel: '#12161f',
  text: '#e6e6e6',
  dim: '#8a8f98',
  accent: '#5ad1ff',
} as const;

export function NowPlayingWidget({ state }: { state: NowPlayingWidgetState }) {
  const hasTrack = !!state.title;
  const loopGlyph = state.repeat === 'one' ? '🔂' : '🔁';
  const loopColor = state.repeat === 'off' ? C.dim : C.accent;
  const likeGlyph = state.liked ? '♥' : '♡';
  const likeColor = state.liked ? C.accent : C.dim;
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: C.bg,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <ImageWidget
          image={(state.artworkUrl ?? '') as ImageWidgetSource}
          imageWidth={52}
          imageHeight={52}
          radius={8}
          clickAction="OPEN_APP"
          style={{ backgroundColor: C.panel }}
        />
        <FlexWidget
          style={{ flex: 1, flexDirection: 'column', paddingHorizontal: 10 }}
          clickAction="OPEN_APP"
        >
          <TextWidget
            text={hasTrack ? state.title! : 'MUJJIC PLAYER'}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 14, fontWeight: 'bold', color: C.text }}
          />
          <TextWidget
            text={hasTrack ? state.artist ?? '' : 'nothing playing'}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 11, color: C.dim, marginTop: 2 }}
          />
        </FlexWidget>
        <TextWidget
          text={state.expanded ? '▴' : '▾'}
          clickAction="TOGGLE_QUEUE"
          style={{ fontSize: 18, color: C.dim, padding: 6 }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 10,
        }}
      >
        <TextWidget text={likeGlyph} clickAction="LIKE" style={{ fontSize: 20, color: likeColor, padding: 6 }} />
        <TextWidget text="⏮" clickAction="PREV" style={{ fontSize: 22, color: C.text, padding: 6 }} />
        <TextWidget
          text={state.isPlaying ? '⏸' : '▶'}
          clickAction="PLAY_PAUSE"
          style={{ fontSize: 24, color: C.accent, padding: 6 }}
        />
        <TextWidget text="⏭" clickAction="NEXT" style={{ fontSize: 22, color: C.text, padding: 6 }} />
        <TextWidget text={loopGlyph} clickAction="LOOP" style={{ fontSize: 20, color: loopColor, padding: 6 }} />
      </FlexWidget>

      {state.expanded && state.upNext.length > 0 ? (
        <ListWidget
          style={{ width: 'match_parent', height: 'match_parent', marginTop: 8 }}
        >
          {state.upNext.map((t, i) => (
            <FlexWidget
              key={t.id}
              clickAction="PLAY_OFFSET"
              clickActionData={{ offset: i + 1 }}
              style={{
                flexDirection: 'column',
                width: 'match_parent',
                paddingVertical: 6,
                paddingHorizontal: 4,
              }}
            >
              <TextWidget
                text={t.title}
                maxLines={1}
                truncate="END"
                style={{ fontSize: 12, color: C.text }}
              />
              <TextWidget
                text={t.artist}
                maxLines={1}
                truncate="END"
                style={{ fontSize: 10, color: C.dim }}
              />
            </FlexWidget>
          ))}
        </ListWidget>
      ) : null}
    </FlexWidget>
  );
}
