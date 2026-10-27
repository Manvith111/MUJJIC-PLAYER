/** Search: input + art-rich results; empty state is an Instagram-style explore feed. */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { Track } from '../api/client';
import { playList } from '../audio/actions';
import { Artwork } from '../components/Artwork';
import { SearchBar } from '../components/SearchBar';
import { TrackRow } from '../components/TrackRow';
import { addToPlaylist, useLibrary } from '../db/library';
import { colors, font } from '../theme/terminal';
import { useMenu } from '../store/menu';
import { useSettings } from '../store/settings';
import { useUI } from '../store/ui';

export function SearchScreen() {
  const { query, results, loading, error, setQuery, runSearch, setView } = useUI();
  const explore = useUI((s) => s.explore);
  const trending = useUI((s) => s.trending);
  const recommended = useUI((s) => s.recommended);
  const loadHome = useUI((s) => s.loadHome);
  const loadingHome = useUI((s) => s.loadingHome);
  const addToPlaylistId = useUI((s) => s.addToPlaylistId);
  const playlistName = useLibrary((s) => s.playlists.find((p) => p.id === addToPlaylistId)?.name);
  const favorites = useLibrary((s) => s.favorites);
  const history = useLibrary((s) => s.history);
  const mostListened = useLibrary((s) => s.mostListened);
  const openMenu = useMenu((s) => s.open);
  const recent = useSettings((s) => s.recentSearches);
  const [added, setAdded] = useState(0);

  const { width } = useWindowDimensions();
  const GAP = 6;
  const tile = Math.floor((width - 24 - GAP * 2) / 3); // 3-up grid inside the 12px page inset

  // Explore grid: a shuffled mix of the user's own music (liked, recently played,
  // most played) plus new discovery (recommended / explore / trending), so every
  // visit surfaces a fresh blend of familiar and new.
  const pool = useMemo(() => {
    const seen = new Set<string>();
    const out: Track[] = [];
    for (const t of [...favorites, ...history, ...mostListened, ...recommended, ...explore, ...trending]) {
      if (t && !seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
    }
    // Fisher–Yates shuffle for a random order each time the mix changes.
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }, [favorites, history, mostListened, recommended, explore, trending]);

  // If the user came straight to Search, make sure the discovery feed has data.
  useEffect(() => {
    if (!query.trim() && !recommended.length && !explore.length && !trending.length) void loadHome();
  }, [query, recommended.length, explore.length, trending.length]);

  const onTrack = (list: Track[], index: number) => {
    if (addToPlaylistId != null) {
      void addToPlaylist(addToPlaylistId, list[index]).then(() => setAdded((n) => n + 1));
    } else {
      void playList(list, index);
    }
  };

  const runRecent = (term: string) => {
    setQuery(term);
    void runSearch();
  };

  const finishAdding = () => {
    useUI.setState({ addToPlaylistId: null });
    setView('playlist');
  };

  const exploreHeader = (
    <View>
      {recent.length ? (
        <>
          <Text style={styles.label}>RECENT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            keyboardShouldPersistTaps="handled"
          >
            {recent.map((term) => (
              <Pressable key={term} onPress={() => runRecent(term)} style={styles.chip}>
                <Ionicons name="time-outline" size={13} color={colors.textDim} />
                <Text style={styles.chipText} numberOfLines={1}>{term}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {favorites.length ? (
        <>
          <Text style={styles.label}>LIKED SONGS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.likedRail}
            keyboardShouldPersistTaps="handled"
          >
            {favorites.map((t, i) => (
              <Pressable
                key={`${t.id}:${i}`}
                onPress={() => onTrack(favorites, i)}
                onLongPress={() => openMenu(t)}
                delayLongPress={300}
                style={{ width: 92 }}
              >
                <Artwork uri={t.thumbnail} id={t.id} size={92} radius={8} brackets />
                <Text style={styles.likedTitle} numberOfLines={1}>{t.title}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.label}>EXPLORE</Text>
      {!pool.length && loadingHome ? <ActivityIndicator color={colors.text} style={{ marginVertical: 20 }} /> : null}
    </View>
  );

  const body = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
          <Text style={styles.hint}>searching…</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center}>
          <Text style={styles.err}>connection error</Text>
          <Text style={styles.hint} numberOfLines={2}>{error}</Text>
          <Pressable onPress={() => setView('settings')} style={styles.linkBtn}>
            <Text style={styles.link}>open setup ▸</Text>
          </Pressable>
        </View>
      );
    }
    if (results.songs.length) {
      return (
        <FlatList
          data={results.songs}
          keyExtractor={(t, i) => `${t.id}:${i}`}
          renderItem={({ item, index }) => <TrackRow track={item} onPlay={() => onTrack(results.songs, index)} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}
        />
      );
    }
    if (query.trim()) return <View style={styles.center}><Text style={styles.hint}>no results</Text></View>;

    // Empty query → explore feed (liked rail + Instagram-style art grid).
    return (
      <FlatList
        data={pool}
        keyExtractor={(t, i) => `${t.id}:${i}`}
        numColumns={3}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ gap: GAP, paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={exploreHeader}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => onTrack(pool, index)}
            onLongPress={() => openMenu(item)}
            delayLongPress={300}
          >
            <Artwork uri={item.thumbnail} id={item.id} size={tile} radius={4} />
          </Pressable>
        )}
        ListEmptyComponent={
          !loadingHome ? <View style={styles.center}><Text style={styles.hint}>type to search for songs</Text></View> : null
        }
      />
    );
  };

  return (
    <View style={styles.root}>
      {addToPlaylistId != null ? (
        <View style={styles.addBanner}>
          <Text style={styles.addText} numberOfLines={1}>Adding to “{playlistName ?? 'playlist'}” · {added} added — tap songs</Text>
          <Pressable onPress={finishAdding} style={styles.doneBtn}>
            <Text style={styles.doneText}>done</Text>
          </Pressable>
        </View>
      ) : null}
      <SearchBar autoFocus />
      <View style={styles.list}>{body()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12 },
  list: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  hint: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim, textAlign: 'center' },
  err: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  linkBtn: { marginTop: 6 },
  link: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  label: { fontFamily: font.display, fontSize: 11, color: colors.textDim, letterSpacing: 1, marginBottom: 8, marginTop: 6 },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.borderDim,
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.panelAlt, maxWidth: 200,
  },
  chipText: { fontFamily: font.family, fontSize: font.xs, color: colors.text, flexShrink: 1 },
  likedRail: { gap: 10, paddingBottom: 4 },
  likedTitle: { fontFamily: font.family, fontSize: 10, color: colors.textDim, marginTop: 4, width: 92 },
  addBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  addText: { flex: 1, fontFamily: font.family, fontSize: font.xs, color: colors.text },
  doneBtn: { backgroundColor: colors.accentBg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 14 },
  doneText: { fontFamily: font.bold, fontSize: font.xs, color: colors.accentInk },
});
