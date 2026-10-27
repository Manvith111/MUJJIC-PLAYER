/**
 * Home-feed rail of the user's playlists: a horizontal row of collage covers that
 * open the playlist, plus a trailing "+" card to create a new one.
 */
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLibrary } from '../db/library';
import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';
import { Collage } from './Collage';

export function PlaylistRail({ onCreate }: { onCreate: () => void }) {
  const playlists = useLibrary((s) => s.playlists);
  const openPlaylist = useUI((s) => s.openPlaylist);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>PLAYLISTS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {playlists.map((p) => (
          <Pressable key={p.id} onPress={() => openPlaylist(p.id)} style={styles.card}>
            <View>
              <Collage covers={p.covers} size={116} radius={8} />
              {p.offline ? (
                <View style={styles.offlineTag}>
                  <MaterialIcons name="download-done" size={10} color={colors.accentInk} />
                  <Text style={styles.offlineTagText}>OFFLINE</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>{p.name}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {p.count} song{p.count === 1 ? '' : 's'}
            </Text>
          </Pressable>
        ))}

        <Pressable onPress={onCreate} style={styles.card}>
          <View style={[styles.addCard]}>
            <MaterialIcons name="add" size={34} color={colors.textDim} />
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>New playlist</Text>
          <Text style={styles.cardSub} numberOfLines={1}>create</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  title: { fontFamily: font.display, fontSize: 13, color: colors.text, letterSpacing: 1, marginBottom: 10 },
  rail: { gap: 12, paddingRight: 12 },
  card: { width: 116 },
  addCard: {
    width: 116,
    height: 116,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDim,
    borderStyle: 'dashed',
    backgroundColor: colors.panelAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontFamily: font.family, fontSize: font.xs, color: colors.text, marginTop: 6 },
  cardSub: { fontFamily: font.family, fontSize: 10, color: colors.textDim, marginTop: 1 },
  offlineTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accentBg,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  offlineTagText: { fontFamily: font.display, fontSize: 7, color: colors.accentInk, letterSpacing: 1 },
});
