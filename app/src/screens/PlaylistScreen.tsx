/**
 * Playlist preview: shows the songs (doesn't auto-play), with play / edit-order /
 * share / add-songs / ⋮ controls, and related tracks after the last song.
 */
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { api, type Track } from '../api/client';
import { playList, shufflePlay } from '../audio/actions';
import { downloadTracks } from '../downloads/manager';
import { Artwork } from '../components/Artwork';
import { Collage } from '../components/Collage';
import {
  addToPlaylist,
  deletePlaylist,
  getPlaylistTracks,
  removeFromPlaylist,
  renamePlaylist,
  setPlaylistOffline,
  setPlaylistTracks,
  useLibrary,
} from '../db/library';
import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';

export function PlaylistScreen() {
  const playlistId = useUI((s) => s.playlistId);
  const setView = useUI((s) => s.setView);
  const setState = useUI.setState;
  const playlists = useLibrary((s) => s.playlists);
  const meta = playlists.find((p) => p.id === playlistId);
  const name = meta?.name ?? 'Playlist';

  const [tracks, setTracks] = useState<Track[]>([]);
  const [related, setRelated] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [menu, setMenu] = useState(false);
  const [rename, setRename] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [dlProgress, setDlProgress] = useState<{ done: number; total: number } | null>(null);

  const downloadAll = async () => {
    if (downloadingAll || !tracks.length || playlistId == null) return;
    setDownloadingAll(true);
    setDlProgress({ done: 0, total: tracks.length });
    const { ok } = await downloadTracks(tracks, (done, total) => setDlProgress({ done, total }));
    // Only badge the playlist offline if at least one track actually saved.
    if (ok > 0) {
      await setPlaylistOffline(playlistId, true);
      await useLibrary.getState().refreshPlaylists();
    }
    setDownloadingAll(false);
    setDlProgress(null);
  };

  const load = async () => {
    if (playlistId == null) return;
    setLoading(true);
    const t = await getPlaylistTracks(playlistId);
    setTracks(t);
    setLoading(false);
    if (t.length) {
      api.recommend(t[t.length - 1].id, 20).then((r) => {
        const have = new Set(t.map((x) => x.id));
        setRelated(r.filter((x) => !have.has(x.id)));
      }).catch(() => setRelated([]));
    } else {
      setRelated([]);
    }
  };

  useEffect(() => {
    void load();
  }, [playlistId]);

  const persist = async (next: Track[]) => {
    setTracks(next);
    if (playlistId != null) await setPlaylistTracks(playlistId, next);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tracks.length) return;
    const next = [...tracks];
    [next[i], next[j]] = [next[j], next[i]];
    void persist(next);
  };

  const remove = async (id: string) => {
    if (playlistId == null) return;
    await removeFromPlaylist(playlistId, id);
    setTracks((cur) => cur.filter((t) => t.id !== id));
  };

  const addRelated = async (t: Track) => {
    if (playlistId == null) return;
    await addToPlaylist(playlistId, t);
    setTracks((cur) => [...cur, t]);
    setRelated((cur) => cur.filter((x) => x.id !== t.id));
  };

  const share = () =>
    void Share.share({ message: `Playlist "${name}"\n` + tracks.map((t) => `• ${t.title} — ${t.artist}`).join('\n') });

  const exportJSON = () => {
    const data = {
      name,
      exported: new Date().toISOString(),
      source: 'Terminal Music',
      tracks: tracks.map((t) => ({ title: t.title, artist: t.artist, album: t.album, duration: t.duration, thumbnail: t.thumbnail })),
    };
    void Share.share({ message: JSON.stringify(data, null, 2) });
  };

  const importFromYT = () => {
    setMenu(false);
    useUI.getState().setImportingPlaylist(true);
  };

  const doDelete = async () => {
    if (playlistId == null) return;
    await deletePlaylist(playlistId);
    await useLibrary.getState().refreshPlaylists();
    setMenu(false);
    setView('library');
  };

  const doRename = async () => {
    // Rename = recreate is overkill; we only store name in playlists table via a light update.
    const nm = (rename ?? '').trim();
    if (!nm || playlistId == null) return;
    await renamePlaylist(playlistId, nm);
    await useLibrary.getState().refreshPlaylists();
    setRename(null);
    setMenu(false);
  };

  const addSongs = () => {
    setState({ addToPlaylistId: playlistId, view: 'search', query: '' });
  };

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Pressable onPress={() => setView('library')} hitSlop={10} style={{ width: 40 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{name.toUpperCase()}</Text>
        <Pressable onPress={() => setMenu(true)} hitSlop={10} style={{ width: 40, alignItems: 'flex-end' }}>
          <MaterialIcons name="more-vert" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.coverWrap}>
        <Collage covers={tracks.map((t) => t.thumbnail).filter(Boolean) as string[]} size={128} radius={10} />
        <View style={styles.countRow}>
          <Text style={styles.count}>{tracks.length} song{tracks.length === 1 ? '' : 's'}</Text>
          {meta?.offline ? (
            <View style={styles.offlineTag}>
              <MaterialIcons name="download-done" size={11} color={colors.accentInk} />
              <Text style={styles.offlineTagText}>OFFLINE</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Round
          name={downloadingAll ? 'downloading' : 'download-for-offline'}
          onPress={downloadAll}
          label={downloadingAll && dlProgress ? `${dlProgress.done}/${dlProgress.total}` : 'Download'}
        />
        <Round name={edit ? 'check' : 'swap-vert'} onPress={() => setEdit((e) => !e)} label={edit ? 'Done' : 'Edit'} />
        <Round name="play-arrow" primary onPress={() => tracks.length && void playList(tracks, 0)} label="Play" />
        <Round name="share" onPress={share} label="Share" />
        <Round name="shuffle" onPress={() => tracks.length && void shufflePlay(tracks)} label="Shuffle" />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {tracks.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.hint}>empty playlist</Text>
              <Pressable onPress={importFromYT} style={styles.emptyImportBtn}>
                <MaterialIcons name="cloud-download" size={18} color={colors.accentInk} />
                <Text style={styles.emptyImportText}>Import from YT Music</Text>
              </Pressable>
            </View>
          ) : (
            tracks.map((t, i) => (
              <View key={`${t.id}:${i}`} style={styles.row}>
                <Artwork uri={t.thumbnail} id={t.id} size={44} radius={6} />
                <Pressable style={styles.meta} onPress={() => !edit && void playList(tracks, i)}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{t.title}</Text>
                  <Text style={styles.rowSub} numberOfLines={1}>{t.artist}</Text>
                </Pressable>
                {edit ? (
                  <View style={styles.editBtns}>
                    <Pressable onPress={() => move(i, -1)} hitSlop={6}><Ionicons name="chevron-up" size={20} color={colors.textDim} /></Pressable>
                    <Pressable onPress={() => move(i, 1)} hitSlop={6}><Ionicons name="chevron-down" size={20} color={colors.textDim} /></Pressable>
                    <Pressable onPress={() => void remove(t.id)} hitSlop={6}><MaterialIcons name="remove-circle-outline" size={20} color={colors.textDim} /></Pressable>
                  </View>
                ) : (
                  <MaterialIcons name="drag-handle" size={20} color={colors.borderDim} />
                )}
              </View>
            ))
          )}

          {related.length ? (
            <>
              <Text style={styles.relatedLabel}>RELATED</Text>
              {related.map((t, i) => (
                <View key={`r:${t.id}:${i}`} style={styles.row}>
                  <Artwork uri={t.thumbnail} id={t.id} size={44} radius={6} />
                  <Pressable style={styles.meta} onPress={() => void playList([...tracks, ...related], tracks.length + i)}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{t.artist}</Text>
                  </Pressable>
                  <Pressable onPress={() => void addRelated(t)} hitSlop={8} style={styles.addBtn}>
                    <MaterialIcons name="add" size={20} color={colors.accentInk} />
                  </Pressable>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {rename == null ? (
              <>
                <Pressable style={styles.mItem} onPress={() => { setMenu(false); addSongs(); }}>
                  <MaterialIcons name="add" size={20} color={colors.text} />
                  <Text style={styles.mLabel}>Add songs</Text>
                </Pressable>
                <Pressable style={styles.mItem} onPress={() => setRename(name)}>
                  <MaterialIcons name="edit" size={20} color={colors.text} />
                  <Text style={styles.mLabel}>Rename playlist</Text>
                </Pressable>
                <Pressable style={styles.mItem} onPress={share}>
                  <MaterialIcons name="share" size={20} color={colors.text} />
                  <Text style={styles.mLabel}>Share</Text>
                </Pressable>
                <Pressable style={styles.mItem} onPress={exportJSON}>
                  <MaterialIcons name="code" size={20} color={colors.text} />
                  <Text style={styles.mLabel}>Export as JSON</Text>
                </Pressable>
                <Pressable style={styles.mItem} onPress={importFromYT}>
                  <MaterialIcons name="cloud-download" size={20} color={colors.text} />
                  <Text style={styles.mLabel}>Import from YT Music</Text>
                </Pressable>
                <Pressable style={styles.mItem} onPress={doDelete}>
                  <MaterialIcons name="delete-outline" size={20} color={colors.text} />
                  <Text style={styles.mLabel}>Delete playlist</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.newRow}>
                <TextInput value={rename} onChangeText={setRename} style={styles.input} onSubmitEditing={doRename} autoFocus />
                <Pressable onPress={doRename} style={styles.cta}><MaterialIcons name="check" size={20} color={colors.accentInk} /></Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Round({ name, label, onPress, primary }: { name: any; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.roundWrap}>
      <View style={[styles.round, primary && styles.roundPrimary]}>
        <MaterialIcons name={name} size={22} color={primary ? colors.accentInk : colors.text} />
      </View>
      <Text style={styles.roundLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: font.display, fontSize: 12, color: colors.text, letterSpacing: 1, flex: 1, textAlign: 'center' },
  coverWrap: { alignItems: 'center', gap: 6, marginVertical: 4 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim },
  offlineTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.accentBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  offlineTagText: { fontFamily: font.display, fontSize: 8, color: colors.accentInk, letterSpacing: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-around' },
  roundWrap: { alignItems: 'center', gap: 4 },
  round: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelAlt },
  roundPrimary: { backgroundColor: colors.accentBg, borderColor: colors.accentBg },
  roundLabel: { fontFamily: font.family, fontSize: 10, color: colors.textDim },
  hint: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim, textAlign: 'center', marginTop: 24 },
  emptyWrap: { alignItems: 'center', gap: 10, marginTop: 24 },
  emptyImportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.accentBg },
  emptyImportText: { fontFamily: font.family, fontSize: font.sm, color: colors.accentInk },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8 },
  meta: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  rowSub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 2 },
  editBtns: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' },
  relatedLabel: { fontFamily: font.display, fontSize: 12, color: colors.text, letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  backdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 32 },
  sheet: { backgroundColor: colors.panel, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10 },
  mItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 8 },
  mLabel: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6 },
  input: { flex: 1, fontFamily: font.family, fontSize: font.sm, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  cta: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' },
});
