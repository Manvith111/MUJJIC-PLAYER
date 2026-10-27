/**
 * Import playlist from YouTube Music (global modal).
 *
 * Two modes:
 *  1. Paste a YT Music playlist URL/ID → fetch → preview → import
 *  2. Browse your YT Music library playlists (requires OAuth setup)
 *
 * Tracks are imported as metadata only — the app searches for them at playback
 * time.  Mounted once in App.tsx; opened via useUI().setImportingPlaylist(true).
 */
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api, type PlaylistItem, type Track, type YTMusicPlaylist } from '../api/client';
import { Collage } from '../components/Collage';
import { createPlaylist, addToPlaylist, useLibrary } from '../db/library';
import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';
import { extractYTPlaylistId } from '../utils/ytmusicUrl';

type Tab = 'url' | 'library';

export function ImportPlaylistModal() {
  const visible = useUI((s) => s.importingPlaylist);
  const close = () => useUI.getState().setImportingPlaylist(false);

  const [tab, setTab] = useState<Tab>('url');

  // URL tab state
  const [urlInput, setUrlInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<YTMusicPlaylist | null>(null);

  // Library tab state
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [libLoading, setLibLoading] = useState(false);
  const [libPlaylists, setLibPlaylists] = useState<PlaylistItem[]>([]);
  const [libError, setLibError] = useState<string | null>(null);
  const [selectedLib, setSelectedLib] = useState<YTMusicPlaylist | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (visible) {
      setUrlInput('');
      setPreview(null);
      setFetchError(null);
      setSelectedLib(null);
      setDone(false);
      setTab('url');
      void checkAuth();
    }
  }, [visible]);

  const checkAuth = async () => {
    try {
      const res = await api.getYTAuthStatus();
      setAuthed(res.authenticated);
    } catch {
      setAuthed(false);
    }
  };

  // ---- URL tab: fetch ----
  const fetchUrl = async () => {
    const id = extractYTPlaylistId(urlInput);
    if (!id) {
      setFetchError('Could not extract a playlist ID from that input');
      return;
    }
    setFetching(true);
    setFetchError(null);
    setPreview(null);
    try {
      const res = await api.fetchPublicYTMusicPlaylist(id);
      setPreview(res);
    } catch (e: any) {
      setFetchError(String(e?.message ?? e));
    } finally {
      setFetching(false);
    }
  };

  // ---- Library tab: load playlists ----
  const loadLibrary = async () => {
    setLibLoading(true);
    setLibError(null);
    try {
      const res = await api.fetchLibraryPlaylists();
      setLibPlaylists(res);
    } catch (e: any) {
      setLibError(String(e?.message ?? e));
    } finally {
      setLibLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'library' && authed && !libPlaylists.length && !libLoading) {
      void loadLibrary();
    }
  }, [tab, authed]);

  const selectLibPlaylist = async (item: PlaylistItem) => {
    setLibLoading(true);
    try {
      const res = await api.fetchLibraryPlaylist(item.id);
      setSelectedLib(res);
    } catch (e: any) {
      setLibError(String(e?.message ?? e));
    } finally {
      setLibLoading(false);
    }
  };

  // ---- Import ----
  const active = preview ?? selectedLib;

  const doImport = async () => {
    if (!active || importing) return;
    setImporting(true);
    try {
      const id = await createPlaylist(active.title);
      for (const t of active.tracks) {
        await addToPlaylist(id, t);
      }
      await useLibrary.getState().refreshPlaylists();
      setDone(true);
    } finally {
      setImporting(false);
    }
  };

  const openImported = () => {
    const playlists = useLibrary.getState().playlists;
    const last = playlists[0]; // most recent
    if (last) useUI.getState().openPlaylist(last.id);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>IMPORT FROM YT MUSIC</Text>

          {!active && !done ? (
            <>
              {/* Tab bar */}
              <View style={styles.tabs}>
                <Pressable onPress={() => setTab('url')} style={[styles.tab, tab === 'url' && styles.tabOn]}>
                  <Text style={[styles.tabText, tab === 'url' && styles.tabTextOn]}>PASTE URL</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTab('library')}
                  style={[styles.tab, tab === 'library' && styles.tabOn]}
                  disabled={!authed}
                >
                  <Text style={[styles.tabText, tab === 'library' && styles.tabTextOn, !authed && styles.dim]}>
                    MY LIBRARY
                  </Text>
                </Pressable>
              </View>

              {tab === 'url' ? (
                <UrlTab
                  url={urlInput}
                  setUrl={setUrlInput}
                  fetching={fetching}
                  error={fetchError}
                  onFetch={fetchUrl}
                />
              ) : (
                <LibraryTab
                  authed={authed}
                  loading={libLoading}
                  error={libError}
                  playlists={libPlaylists}
                  onSelect={selectLibPlaylist}
                />
              )}
            </>
          ) : done ? (
            <View style={styles.center}>
              <MaterialIcons name="check-circle" size={36} color={colors.accent} />
              <Text style={styles.doneText}>Imported {active?.tracks.length ?? 0} tracks</Text>
              <Pressable onPress={openImported} style={styles.btn}>
                <Text style={styles.btnText}>Open playlist</Text>
              </Pressable>
              <Pressable onPress={close} style={[styles.btn, styles.btnGhost]}>
                <Text style={styles.btnText}>Close</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Preview */}
              <PreviewHeader playlist={active!} />
              <PreviewTracks tracks={active!.tracks} />
              <View style={styles.importRow}>
                <Pressable onPress={close} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void doImport()}
                  style={[styles.btn, styles.btnPrimary]}
                  disabled={importing}
                >
                  {importing ? (
                    <ActivityIndicator size="small" color={colors.accentInk} />
                  ) : (
                    <Text style={[styles.btnText, { color: colors.accentInk }]}>
                      Import {active!.tracks.length} tracks
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---- Sub-components ----

function UrlTab({
  url,
  setUrl,
  fetching,
  error,
  onFetch,
}: {
  url: string;
  setUrl: (v: string) => void;
  fetching: boolean;
  error: string | null;
  onFetch: () => void;
}) {
  return (
    <>
      <Text style={styles.help}>
        Paste a YouTube Music playlist URL or ID (e.g. PLxxxxx or https://music.youtube.com/playlist?list=PLxxxxx)
      </Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="playlist URL or ID"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={onFetch} style={[styles.btn, styles.btnPrimary]} disabled={fetching || !url.trim()}>
        {fetching ? (
          <ActivityIndicator size="small" color={colors.accentInk} />
        ) : (
          <Text style={[styles.btnText, { color: colors.accentInk }]}>Fetch</Text>
        )}
      </Pressable>
    </>
  );
}

function LibraryTab({
  authed,
  loading,
  error,
  playlists,
  onSelect,
}: {
  authed: boolean | null;
  loading: boolean;
  error: string | null;
  playlists: PlaylistItem[];
  onSelect: (item: PlaylistItem) => void;
}) {
  if (authed === null) {
    return <ActivityIndicator color={colors.text} style={{ marginVertical: 20 }} />;
  }
  if (!authed) {
    return (
      <View style={styles.center}>
        <Text style={styles.help}>
          YouTube Music OAuth is not set up. Go to Settings to configure it.
        </Text>
      </View>
    );
  }
  if (loading && !playlists.length) {
    return <ActivityIndicator color={colors.text} style={{ marginVertical: 20 }} />;
  }
  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }
  return (
    <FlatList
      data={playlists}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <Pressable style={styles.libRow} onPress={() => onSelect(item)}>
          {item.thumbnail ? (
            <Collage covers={[item.thumbnail]} size={40} radius={4} />
          ) : (
            <View style={styles.libThumb}>
              <MaterialIcons name="queue-music" size={20} color={colors.textDim} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.libTitle} numberOfLines={1}>{item.title}</Text>
            {item.author ? <Text style={styles.libSub} numberOfLines={1}>{item.author}</Text> : null}
          </View>
          <MaterialIcons name="chevron-right" size={18} color={colors.textDim} />
        </Pressable>
      )}
      contentContainerStyle={{ gap: 4, paddingVertical: 4 }}
      style={{ maxHeight: 300 }}
    />
  );
}

function PreviewHeader({ playlist }: { playlist: YTMusicPlaylist }) {
  return (
    <View style={styles.previewHeader}>
      <Collage
        covers={playlist.tracks.slice(0, 4).map((t) => t.thumbnail).filter(Boolean) as string[]}
        size={64}
        radius={6}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.previewTitle} numberOfLines={2}>{playlist.title}</Text>
        {playlist.author ? <Text style={styles.previewSub}>{playlist.author}</Text> : null}
        <Text style={styles.previewSub}>{playlist.trackCount} tracks</Text>
      </View>
    </View>
  );
}

function PreviewTracks({ tracks }: { tracks: Track[] }) {
  return (
    <ScrollView style={styles.previewList} nestedScrollEnabled>
      {tracks.slice(0, 100).map((t, i) => (
        <View key={`${t.id}:${i}`} style={styles.previewRow}>
          <Text style={styles.previewIdx}>{i + 1}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.previewTrackTitle} numberOfLines={1}>{t.title}</Text>
            <Text style={styles.previewTrackSub} numberOfLines={1}>{t.artist}</Text>
          </View>
        </View>
      ))}
      {tracks.length > 100 ? (
        <Text style={styles.previewMore}>…and {tracks.length - 100} more</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.panel, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10, maxHeight: '85%' },
  title: { fontFamily: font.display, fontSize: 11, color: colors.text, letterSpacing: 1 },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, borderWidth: 1, borderColor: colors.borderDim, borderRadius: 6, paddingVertical: 6, alignItems: 'center', backgroundColor: colors.panelAlt },
  tabOn: { borderColor: colors.accent, backgroundColor: colors.panel },
  tabText: { fontFamily: font.family, fontSize: 10, color: colors.textDim, letterSpacing: 1 },
  tabTextOn: { color: colors.text },
  dim: { color: colors.textFaint },
  help: { fontFamily: font.family, fontSize: font.xs, color: colors.textFaint, lineHeight: 16 },
  input: {
    fontFamily: font.family, fontSize: font.sm, color: colors.text, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.panelAlt,
  },
  error: { fontFamily: font.family, fontSize: font.xs, color: colors.red },
  center: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  doneText: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 11 },
  btnGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panelAlt },
  btnPrimary: { backgroundColor: colors.accentBg },
  btnText: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  importRow: { flexDirection: 'row', gap: 10, marginTop: 4 },

  // Library tab
  libRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4 },
  libThumb: { width: 40, height: 40, borderRadius: 4, backgroundColor: colors.panelAlt, borderWidth: 1, borderColor: colors.borderDim, alignItems: 'center', justifyContent: 'center' },
  libTitle: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  libSub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 1 },

  // Preview
  previewHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  previewTitle: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  previewSub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 2 },
  previewList: { maxHeight: 240 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  previewIdx: { fontFamily: font.family, fontSize: font.xs, color: colors.textFaint, width: 24, textAlign: 'right' },
  previewTrackTitle: { fontFamily: font.family, fontSize: font.xs, color: colors.text },
  previewTrackSub: { fontFamily: font.family, fontSize: 10, color: colors.textDim },
  previewMore: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, textAlign: 'center', paddingVertical: 6 },
});
