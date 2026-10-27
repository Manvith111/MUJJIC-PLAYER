/**
 * Bottom-sheet action menu (the "⋮"): Play next, Add to queue, Save to playlist,
 * Download, Pin, Share — plus a Sleep timer entry when opened from Now Playing.
 * Mounted once globally in App.
 */
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { playList } from '../audio/actions';
import { enqueue, insertNext, peekPlay } from '../audio/player';
import { useSleep } from '../audio/sleep';
import { Artwork } from './Artwork';
import { addToPlaylist, createPlaylist, toggleFavorite, togglePin, useLibrary } from '../db/library';
import { deleteDownload, downloadTrack } from '../downloads/manager';
import { colors, font } from '../theme/terminal';
import { formatTime } from '../utils/format';
import { useMenu } from '../store/menu';

type Mode = 'actions' | 'playlists' | 'sleep';
const SLEEP_OPTIONS = [15, 30, 45, 60];

export function TrackMenu() {
  const track = useMenu((s) => s.track);
  const withSleep = useMenu((s) => s.withSleep);
  const close = useMenu((s) => s.close);
  const playlists = useLibrary((s) => s.playlists);
  const isFav = useLibrary((s) => (track ? s.isFavorite(track.id) : false));
  const isDown = useLibrary((s) => (track ? s.isDownloaded(track.id) : false));
  const isPin = useLibrary((s) => (track ? s.isPinned(track.id) : false));
  const sleep = useSleep();
  const [mode, setMode] = useState<Mode>('actions');
  const [newName, setNewName] = useState('');
  const [customMin, setCustomMin] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (track) {
      setMode('actions');
      setNewName('');
      setCustomMin('');
      setNote('');
      void useLibrary.getState().refreshPlaylists();
    }
  }, [track]);

  if (!track) return null;
  const t = track;
  const done = () => close();

  const share = async () => {
    try {
      await Share.share({ message: `${t.title} — ${t.artist}\nhttps://youtu.be/${t.id}` });
    } catch {
      // Share isn't available on web; ignore.
    }
    done();
  };

  const actions = [
    { icon: 'play-arrow', label: 'Play now', onPress: () => { void playList([t], 0); done(); } },
    { icon: 'playlist-play', label: 'Play next', onPress: () => { insertNext(t); done(); } },
    { icon: 'queue-music', label: 'Add to queue', onPress: () => { enqueue([t]); done(); } },
    { icon: 'preview', label: 'Peek (keep queue)', onPress: () => { void peekPlay(t); done(); } },
    { icon: 'playlist-add', label: 'Add to playlist', onPress: () => setMode('playlists') },
    {
      icon: isDown ? 'download-done' : 'file-download',
      label: isDown ? 'Remove download' : 'Download',
      onPress: () => { isDown ? void deleteDownload(t.id) : void downloadTrack(t); done(); },
    },
    {
      icon: isFav ? 'favorite' : 'favorite-border',
      label: isFav ? 'Unlike' : 'Like',
      onPress: () => { void toggleFavorite(t).then(() => useLibrary.getState().refreshFavorites()); done(); },
    },
    { icon: 'share', label: 'Share', onPress: share },
    {
      icon: isPin ? 'push-pin' : 'outlined-flag',
      label: isPin ? 'Unpin from speed dial' : 'Pin to speed dial',
      onPress: () => { void togglePin(t).then(() => useLibrary.getState().refreshPinned()); done(); },
    },
    ...(withSleep ? [{ icon: 'bedtime', label: 'Sleep timer', onPress: () => setMode('sleep') }] : []),
  ];

  const saveToPlaylist = async (id: number, name: string) => {
    await addToPlaylist(id, t);
    setNote(`Added to "${name}"`);
    setTimeout(done, 700);
  };

  const createAndSave = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = await createPlaylist(name);
    await addToPlaylist(id, t);
    await useLibrary.getState().refreshPlaylists();
    setNote(`Created "${name}"`);
    setTimeout(done, 800);
  };

  const startSleep = (min: number) => {
    if (min > 0) sleep.set(min);
    done();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={done}>
      <Pressable style={styles.backdrop} onPress={done}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Artwork uri={t.thumbnail} id={t.id} size={44} radius={6} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>{t.title}</Text>
              <Text style={styles.sub} numberOfLines={1}>{t.artist}</Text>
            </View>
          </View>

          {note ? <Text style={styles.note}>{note}</Text> : null}

          {mode === 'actions' &&
            actions.map((a) => (
              <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                <MaterialIcons name={a.icon as any} size={22} color={colors.text} />
                <Text style={styles.itemLabel}>{a.label}</Text>
              </Pressable>
            ))}

          {mode === 'playlists' && (
            <>
              <Pressable onPress={() => setMode('actions')} style={styles.item}>
                <Ionicons name="chevron-back" size={20} color={colors.textDim} />
                <Text style={styles.itemLabel}>Save to playlist</Text>
              </Pressable>
              <View style={styles.newRow}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="new playlist name"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                  onSubmitEditing={createAndSave}
                />
                <Pressable onPress={createAndSave} style={styles.cta}>
                  <MaterialIcons name="add" size={20} color={colors.accentInk} />
                </Pressable>
              </View>
              {playlists.map((p) => (
                <Pressable key={p.id} onPress={() => void saveToPlaylist(p.id, p.name)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                  <MaterialIcons name="queue-music" size={22} color={colors.text} />
                  <Text style={styles.itemLabel}>{p.name}</Text>
                </Pressable>
              ))}
              {!playlists.length ? <Text style={styles.empty}>type a name and tap + to create your first playlist</Text> : null}
            </>
          )}

          {mode === 'sleep' && (
            <>
              <Pressable onPress={() => setMode('actions')} style={styles.item}>
                <Ionicons name="chevron-back" size={20} color={colors.textDim} />
                <Text style={styles.itemLabel}>Sleep timer</Text>
              </Pressable>
              {sleep.remaining != null ? (
                <View style={styles.chipRow}>
                  <Text style={styles.itemLabel}>{formatTime(sleep.remaining)} left</Text>
                  <Pressable onPress={() => { sleep.cancel(); done(); }} style={styles.chip}>
                    <Text style={styles.chipText}>cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.chipRow}>
                    {SLEEP_OPTIONS.map((m) => (
                      <Pressable key={m} onPress={() => startSleep(m)} style={styles.chip}>
                        <Text style={styles.chipText}>{m}m</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.newRow}>
                    <TextInput
                      value={customMin}
                      onChangeText={setCustomMin}
                      placeholder="custom minutes"
                      placeholderTextColor={colors.textFaint}
                      keyboardType="number-pad"
                      style={styles.input}
                      onSubmitEditing={() => startSleep(parseInt(customMin, 10) || 0)}
                    />
                    <Pressable onPress={() => startSleep(parseInt(customMin, 10) || 0)} style={styles.cta}>
                      <MaterialIcons name="check" size={20} color={colors.accentInk} />
                    </Pressable>
                  </View>
                </>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.panel,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderDim, marginBottom: 6 },
  title: { fontFamily: font.bold, fontSize: font.sm, color: colors.text },
  sub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 2 },
  note: { fontFamily: font.family, fontSize: font.xs, color: colors.text, paddingVertical: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 13 },
  pressed: { backgroundColor: colors.panelAlt, borderRadius: 8 },
  itemLabel: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  input: { flex: 1, fontFamily: font.family, fontSize: font.sm, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  cta: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, paddingVertical: 10 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.panelAlt },
  chipText: { fontFamily: font.family, fontSize: font.xs, color: colors.text },
});
