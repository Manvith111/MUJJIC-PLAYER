/** Home feed: wordmark, search, category pills, and album-art rails. */
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryPills } from '../components/CategoryPills';
import { PlaylistRail } from '../components/PlaylistRail';
import { SearchBar } from '../components/SearchBar';
import { Section } from '../components/Section';
import { useLibrary } from '../db/library';
import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';

export function HomeScreen() {
  const { trending, recommended, explore, exploreGenre, loadingHome, homeError, loadHome, setView } = useUI();
  const setCreatingPlaylist = useUI((s) => s.setCreatingPlaylist);
  const { mostListened, history, pinned, playlists, refreshAll } = useLibrary();

  // Personalise the recommended header with the artist that seeded it.
  const seedArtist = (mostListened[0]?.artist || history[0]?.artist || '').split(',')[0].trim();
  const recTitle = seedArtist ? `MORE LIKE ${seedArtist.toUpperCase()}` : 'RECOMMENDED FOR YOU';

  useEffect(() => {
    void refreshAll();
    void loadHome();
  }, []);

  const empty =
    !trending.length && !recommended.length && !mostListened.length && !history.length && !loadingHome;

  return (
    <View style={styles.root}>
      <Text style={styles.brand}>
        MUJJIC<Text style={styles.brandAccent}>//</Text>PLAYER
      </Text>

      <SearchBar />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Text style={styles.sectionLabel}>CATEGORIES</Text>
        <View style={{ marginBottom: 18 }}>
          <CategoryPills />
        </View>

        {loadingHome && !trending.length ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.text} />
            <Text style={styles.hint}>loading…</Text>
          </View>
        ) : homeError && !trending.length ? (
          <View style={styles.center}>
            <Text style={styles.err}>can't reach the backend</Text>
            <Text style={styles.hint} numberOfLines={2}>{homeError}</Text>
            <Pressable onPress={() => setView('settings')} style={styles.linkBtn}>
              <Text style={styles.link}>open setup ▸</Text>
            </Pressable>
          </View>
        ) : null}

        {playlists.length ? <PlaylistRail onCreate={() => setCreatingPlaylist(true)} /> : null}
        <Section title="PINNED" tracks={pinned} round />
        <Section title="MOST LISTENED" tracks={mostListened} />
        <Section title="QUICK PLAYS" tracks={history} />
        <Section title={recTitle} tracks={recommended} />
        <Section title="TRENDING" tracks={trending} />
        <Section title={exploreGenre ? `EXPLORE · ${exploreGenre.toUpperCase()}` : 'EXPLORE'} tracks={explore} />

        {empty && !homeError ? (
          <View style={styles.center}>
            <Text style={styles.hint}>search for music to get started</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 8 },
  brand: { fontFamily: font.display, fontSize: 17, color: colors.text, letterSpacing: 1, marginTop: 0 },
  brandAccent: { color: colors.textFaint },
  body: { paddingTop: 12, paddingBottom: 8 },
  sectionLabel: { fontFamily: font.display, fontSize: 13, color: colors.text, letterSpacing: 1, marginBottom: 10 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  hint: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim, textAlign: 'center' },
  err: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  linkBtn: { marginTop: 6 },
  link: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
});
