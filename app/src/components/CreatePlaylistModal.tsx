/**
 * Create-playlist popup (global): give the playlist a name, then either just
 * create it or create it and jump into Search to add songs. Mounted once in App
 * and opened via `useUI().setCreatingPlaylist(true)` from Home or Library.
 */
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createPlaylist, useLibrary } from '../db/library';
import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';

export function CreatePlaylistModal() {
  const visible = useUI((s) => s.creatingPlaylist);
  const close = () => useUI.getState().setCreatingPlaylist(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) setName('');
  }, [visible]);

  const create = async (addSongs: boolean): Promise<void> => {
    const nm = name.trim();
    if (!nm) return;
    const id = await createPlaylist(nm);
    await useLibrary.getState().refreshPlaylists();
    close();
    if (addSongs) {
      // Hand off to Search in "add to this playlist" mode.
      useUI.setState({ addToPlaylistId: id, view: 'search', query: '' });
    } else {
      useUI.getState().openPlaylist(id);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>NEW PLAYLIST</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="playlist name"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoFocus
            onSubmitEditing={() => void create(false)}
          />
          <View style={styles.row}>
            <Pressable onPress={() => void create(false)} style={[styles.btn, styles.btnGhost]} disabled={!name.trim()}>
              <Text style={[styles.btnText, !name.trim() && styles.dim]}>Create</Text>
            </Pressable>
            <Pressable onPress={() => void create(true)} style={[styles.btn, styles.btnPrimary]} disabled={!name.trim()}>
              <MaterialIcons name="add" size={16} color={colors.accentInk} />
              <Text style={[styles.btnText, { color: colors.accentInk }]}>Add songs</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 28 },
  sheet: { backgroundColor: colors.panel, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12 },
  title: { fontFamily: font.display, fontSize: 12, color: colors.text, letterSpacing: 1 },
  input: {
    fontFamily: font.family, fontSize: font.sm, color: colors.text, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: colors.panelAlt,
  },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 11 },
  btnGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panelAlt },
  btnPrimary: { backgroundColor: colors.accentBg },
  btnText: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  dim: { color: colors.textFaint },
});
