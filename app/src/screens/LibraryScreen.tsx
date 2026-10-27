/** Library: favorites, downloads (offline), history, and user playlists. */
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Track } from '../api/client';
import { loadQueue } from '../audio/player';
import { Collage } from '../components/Collage';
import { TrackRow } from '../components/TrackRow';
import { pushHistory, useLibrary, type PlaylistMeta } from '../db/library';
import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';

type Sub = 'playlists' | 'downloads' | 'favorites' | 'history';
const SUBS: { key: Sub; label: string }[] = [
  { key: 'playlists', label: 'PLAYLISTS' },
  { key: 'downloads', label: 'OFFLINE' },
  { key: 'favorites', label: 'LIKED' },
  { key: 'history', label: 'RECENT' },
];

// The OFFLINE tab has two sub-pages.
type Offline = 'songs' | 'playlists';

export function LibraryScreen() {
  const setView = useUI((s) => s.setView);
  const openPlaylistView = useUI((s) => s.openPlaylist);
  const setCreatingPlaylist = useUI((s) => s.setCreatingPlaylist);
  const { favorites, downloads, history, playlists, refreshAll } = useLibrary();
  const [sub, setSub] = useState<Sub>('playlists');
  const [offline, setOffline] = useState<Offline>('songs');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    void refreshAll();
  }, []);

  const play = async (list: Track[], index: number) => {
    await loadQueue(list, index);
    void pushHistory(list[index]);
  };

  const filteredPlaylists = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? playlists.filter((p) => p.name.toLowerCase().includes(q)) : playlists;
  }, [playlists, filter]);

  const offlinePlaylists = useMemo(() => playlists.filter((p) => p.offline), [playlists]);

  const list = sub === 'favorites' ? favorites : sub === 'history' ? history : [];

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Pressable onPress={() => setView('home')} hitSlop={8} style={{ width: 48 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>LIBRARY</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.subTabs}>
        {SUBS.map((s) => (
          <Pressable key={s.key} onPress={() => setSub(s.key)} style={[styles.subTab, sub === s.key && styles.subTabOn]}>
            <Text style={[styles.subTabText, sub === s.key && styles.subTabTextOn]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {sub === 'playlists' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textDim} />
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="search playlists"
              placeholderTextColor={colors.textFaint}
              style={styles.searchInput}
            />
            {filter ? (
              <Pressable onPress={() => setFilter('')} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.textDim} />
              </Pressable>
            ) : null}
          </View>

          {filteredPlaylists.length ? (
            <FlatList
              data={filteredPlaylists}
              keyExtractor={(p) => String(p.id)}
              renderItem={({ item }) => <PlaylistRow item={item} onOpen={() => openPlaylistView(item.id)} />}
              contentContainerStyle={{ paddingBottom: 96 }}
            />
          ) : (
            <Empty text={filter ? 'no playlists match your search' : 'no playlists yet — tap + to create one, or use a song’s ⋮ menu'} />
          )}

          {/* Sticky create button (name part comes from the popup). */}
          <Pressable onPress={() => setCreatingPlaylist(true)} style={styles.fab}>
            <MaterialIcons name="add" size={28} color={colors.accentInk} />
          </Pressable>
        </View>
      ) : sub === 'downloads' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.pageTabs}>
            <Pressable onPress={() => setOffline('songs')} style={[styles.pageTab, offline === 'songs' && styles.pageTabOn]}>
              <Text style={[styles.pageTabText, offline === 'songs' && styles.pageTabTextOn]}>ALL SONGS</Text>
            </Pressable>
            <Pressable onPress={() => setOffline('playlists')} style={[styles.pageTab, offline === 'playlists' && styles.pageTabOn]}>
              <Text style={[styles.pageTabText, offline === 'playlists' && styles.pageTabTextOn]}>OFFLINE PLAYLISTS</Text>
            </Pressable>
          </View>

          {offline === 'songs' ? (
            downloads.length ? (
              <FlatList
                data={downloads}
                keyExtractor={(t, i) => `${t.id}:${i}`}
                renderItem={({ item, index }) => <TrackRow track={item} index={index} onPlay={() => void play(downloads, index)} />}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            ) : (
              <Empty text="no downloads yet — tap ⤓ on any track" />
            )
          ) : offlinePlaylists.length ? (
            <FlatList
              data={offlinePlaylists}
              keyExtractor={(p) => String(p.id)}
              renderItem={({ item }) => <PlaylistRow item={item} onOpen={() => openPlaylistView(item.id)} />}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          ) : (
            <Empty text="no offline playlists yet — open a playlist and tap Download to make it available offline" />
          )}
        </View>
      ) : list.length ? (
        <FlatList
          data={list}
          keyExtractor={(t, i) => `${t.id}:${i}`}
          renderItem={({ item, index }) => <TrackRow track={item} index={index} onPlay={() => void play(list, index)} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      ) : (
        <Empty text={sub === 'favorites' ? 'no liked songs yet — tap ♥' : 'nothing played yet'} />
      )}
    </View>
  );
}

function PlaylistRow({ item, onOpen }: { item: PlaylistMeta; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.plRow, pressed && styles.plPressed]}>
      <Collage covers={item.covers} size={52} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.plNameRow}>
          <Text style={styles.plName} numberOfLines={1}>{item.name}</Text>
          {item.offline ? (
            <View style={styles.offlineTag}>
              <MaterialIcons name="download-done" size={10} color={colors.accentInk} />
              <Text style={styles.offlineTagText}>OFFLINE</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.plSub}>{item.count ? `${item.count} song${item.count === 1 ? '' : 's'}` : 'empty playlist'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.hint}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 10 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: font.family, fontSize: font.sm, color: colors.text, letterSpacing: 2 },
  subTabs: { flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  subTab: { flex: 1, borderWidth: 1, borderColor: colors.borderDim, borderRadius: 6, paddingVertical: 6, alignItems: 'center', backgroundColor: colors.panelAlt },
  subTabOn: { borderColor: colors.accent, backgroundColor: colors.panel },
  subTabText: { fontFamily: font.family, fontSize: 10, color: colors.textDim, letterSpacing: 1 },
  subTabTextOn: { color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim, textAlign: 'center' },
  plRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  plPressed: { backgroundColor: colors.panelAlt, borderRadius: 8 },
  plNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  plName: { fontFamily: font.family, fontSize: font.sm, color: colors.text, flexShrink: 1 },
  plSub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 2 },
  offlineTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.accentBg, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  offlineTagText: { fontFamily: font.display, fontSize: 7, color: colors.accentInk, letterSpacing: 1 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.panelAlt,
  },
  searchInput: { flex: 1, fontFamily: font.family, fontSize: font.sm, color: colors.text, padding: 0 },
  pageTabs: { flexDirection: 'row', gap: 8 },
  pageTab: { flex: 1, borderBottomWidth: 2, borderBottomColor: 'transparent', paddingVertical: 8, alignItems: 'center' },
  pageTabOn: { borderBottomColor: colors.accent },
  pageTabText: { fontFamily: font.display, fontSize: 10, color: colors.textDim, letterSpacing: 1 },
  pageTabTextOn: { color: colors.text },
  fab: {
    position: 'absolute', right: 4, bottom: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.accentBg,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
});
