/** Compact now-playing bar pinned above the bottom nav; tap to expand. */
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { exitPeek, next, previous, togglePlay, usePlayer } from '../audio/player';
import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';
import { Artwork } from './Artwork';

export function MiniPlayer() {
  const { current, isPlaying, position, duration, peeking } = usePlayer();
  const setView = useUI((s) => s.setView);
  if (!current) return null;
  const total = duration || current.duration || 0;
  const frac = total > 0 ? Math.min(1, position / total) : 0;

  return (
    <Pressable onPress={() => setView('nowplaying')} style={styles.wrap}>
      {peeking ? (
        <Pressable onPress={() => void exitPeek()} hitSlop={8} style={styles.peekBadge}>
          <MaterialIcons name="undo" size={14} color={colors.accentInk} />
          <Text style={styles.peekText}>PEEK · resume queue</Text>
        </Pressable>
      ) : null}
      <Artwork uri={current.thumbnail} id={current.id} size={40} radius={6} />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{current.artist}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${frac * 100}%` }]} />
        </View>
      </View>
      <Pressable onPress={() => void previous()} hitSlop={10} style={styles.btn}>
        <MaterialIcons name="skip-previous" size={26} color={colors.textDim} />
      </Pressable>
      <Pressable onPress={togglePlay} hitSlop={10} style={styles.btn}>
        <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color={colors.text} />
      </Pressable>
      <Pressable onPress={() => void next()} hitSlop={10} style={styles.btn}>
        <MaterialIcons name="skip-next" size={26} color={colors.textDim} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.panel,
    padding: 8,
  },
  meta: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.bold, fontSize: font.xs, color: colors.text },
  sub: { fontFamily: font.family, fontSize: 10, color: colors.textDim, marginTop: 1 },
  track: { height: 2, backgroundColor: colors.borderDim, borderRadius: 2, marginTop: 5 },
  fill: { height: 2, backgroundColor: colors.accent, borderRadius: 2 },
  btn: { paddingHorizontal: 2 },
  peekBadge: {
    position: 'absolute',
    top: -11,
    right: 10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  peekText: { fontFamily: font.bold, fontSize: 9, color: colors.accentInk, letterSpacing: 1 },
});
