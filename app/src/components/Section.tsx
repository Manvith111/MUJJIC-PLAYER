/**
 * A home-feed section: pixel header + a horizontal rail of album-art cards.
 * Tapping a card plays that list starting at the tapped item.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Track } from '../api/client';
import { playList } from '../audio/actions';
import { colors, font } from '../theme/terminal';
import { useMenu } from '../store/menu';
import { Artwork } from './Artwork';

type Props = {
  title: string;
  tracks: Track[];
  onSeeAll?: () => void;
  round?: boolean;
};

export function Section({ title, tracks, onSeeAll, round }: Props) {
  const openMenu = useMenu((s) => s.open);
  if (!tracks.length) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAll}>view all</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {tracks.map((t, i) => (
          <Pressable
            key={`${t.id}:${i}`}
            onPress={() => void playList(tracks, i)}
            onLongPress={() => openMenu(t)}
            delayLongPress={300}
            style={styles.card}
          >
            <Artwork uri={t.thumbnail} id={t.id} size={116} circle={round} radius={8} brackets />
            <Text style={styles.cardTitle} numberOfLines={1}>
              {t.title}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {t.artist}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  title: { fontFamily: font.display, fontSize: 13, color: colors.text, letterSpacing: 1 },
  seeAll: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim },
  rail: { gap: 12, paddingRight: 12 },
  card: { width: 116 },
  cardTitle: { fontFamily: font.family, fontSize: font.xs, color: colors.text, marginTop: 6 },
  cardSub: { fontFamily: font.family, fontSize: 10, color: colors.textDim, marginTop: 1 },
});
