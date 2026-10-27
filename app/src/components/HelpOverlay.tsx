/** A modal help overlay listing controls, toggled from the footer "? help". */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';

const ROWS: [string, string][] = [
  ['▷ / ‖', 'play / pause'],
  ['|◁   ▷|', 'previous / next track'],
  ['◁◁  ▷▷', 'seek −10s / +10s'],
  ['SHUF', 'toggle shuffle'],
  ['RPT', 'repeat off → all → one'],
  ['A–B', 'set loop A, then B (tap again to clear)'],
  ['♥', 'like / unlike a track'],
  ['⤓', 'download for offline (tap again to remove)'],
  ['+Q', 'add track to the queue'],
  ['♪', 'now playing · sleep timer · autoplay'],
  ['≡Q', 'view / jump around the queue'],
  ['LIB', 'offline, liked, recent, playlists'],
  ['⚙', 'backend URL & volume'],
];

export function HelpOverlay() {
  const { showHelp, toggleHelp } = useUI();
  return (
    <Modal visible={showHelp} transparent animationType="fade" onRequestClose={toggleHelp}>
      <Pressable style={styles.backdrop} onPress={toggleHelp}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>┤ CONTROLS ├</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {ROWS.map(([k, v]) => (
              <View key={k} style={styles.row}>
                <Text style={styles.key}>{k}</Text>
                <Text style={styles.val}>{v}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable onPress={toggleHelp} style={styles.close}>
            <Text style={styles.closeText}>close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.panel, padding: 18 },
  title: { fontFamily: font.family, fontSize: font.md, color: colors.accent, textAlign: 'center', marginBottom: 12, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.borderDim, gap: 12 },
  key: { fontFamily: font.family, fontSize: font.sm, color: colors.cyan, width: 92 },
  val: { fontFamily: font.family, fontSize: font.sm, color: colors.text, flex: 1 },
  close: { marginTop: 14, alignSelf: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: colors.panelAlt },
  closeText: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
});
