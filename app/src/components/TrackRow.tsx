/**
 * Track row (YouTube-Music style): cover art + title/artist, and a single "⋮"
 * that opens the action menu. Tap the row to play.
 */
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Track } from '../api/client';
import { usePlayer } from '../audio/player';
import { colors, font } from '../theme/terminal';
import { useMenu } from '../store/menu';
import { Artwork } from './Artwork';

type Props = {
  track: Track;
  index?: number;
  active?: boolean;
  round?: boolean;
  onPlay: () => void;
};

export function TrackRow({ track, active, round, onPlay }: Props) {
  const isCurrent = usePlayer((s) => s.current?.id === track.id);
  const isPlaying = usePlayer((s) => s.isPlaying && s.current?.id === track.id);
  const openMenu = useMenu((s) => s.open);

  return (
    <Pressable
      onPress={onPlay}
      onLongPress={() => openMenu(track)}
      delayLongPress={300}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View>
        <Artwork uri={track.thumbnail} id={track.id} size={46} circle={round} radius={6} />
        {isCurrent ? (
          <View style={styles.badge}>
            <MaterialIcons name={isPlaying ? 'graphic-eq' : 'pause'} size={14} color={colors.accentInk} />
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={[styles.title, (active || isCurrent) && styles.titleActive]} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {track.artist}
          {track.durationText ? `  ·  ${track.durationText}` : ''}
        </Text>
      </View>
      <Pressable onPress={() => openMenu(track)} hitSlop={10} style={styles.kebab}>
        <MaterialIcons name="more-vert" size={22} color={colors.textDim} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 10 },
  pressed: { backgroundColor: colors.panelAlt },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  meta: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  titleActive: { fontFamily: font.bold },
  sub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 2 },
  kebab: { padding: 4 },
});
