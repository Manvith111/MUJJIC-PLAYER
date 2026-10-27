/** Up-next queue in play order; tap a row to jump to it. */
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveQueueAsPlaylist } from '../audio/actions';
import { jumpTo, usePlayer } from '../audio/player';
import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';

export function QueueScreen() {
  const setView = useUI((s) => s.setView);
  const { queue, order, orderPos } = usePlayer();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  // Render in playback order.
  const rows = order.map((queueIndex, pos) => ({ track: queue[queueIndex], queueIndex, pos })).filter((r) => r.track);

  const save = async () => {
    const id = await saveQueueAsPlaylist(name);
    if (id != null) {
      setNote(`Saved "${name.trim() || 'Saved Queue'}"`);
      setName('');
      setSaving(false);
      setTimeout(() => setNote(''), 1500);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Pressable onPress={() => setView('home')} hitSlop={8}>
          <Text style={styles.back}>◂ back</Text>
        </Pressable>
        <Text style={styles.title}>QUEUE · {rows.length}</Text>
        <Pressable onPress={() => setSaving((s) => !s)} hitSlop={8} style={styles.saveBtn} disabled={!rows.length}>
          <MaterialIcons name="playlist-add" size={22} color={rows.length ? colors.accent : colors.textFaint} />
        </Pressable>
      </View>

      {saving ? (
        <View style={styles.saveRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="name this playlist"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoFocus
            onSubmitEditing={() => void save()}
          />
          <Pressable onPress={() => void save()} style={styles.cta}>
            <MaterialIcons name="check" size={20} color={colors.accentInk} />
          </Pressable>
        </View>
      ) : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}

      {rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.hint}>queue is empty — play something first</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => `${r.queueIndex}:${r.pos}`}
          renderItem={({ item }) => {
            const isCurrent = item.pos === orderPos;
            const isPast = item.pos < orderPos;
            return (
              <Pressable
                onPress={() => void jumpTo(item.queueIndex)}
                style={({ pressed }) => [styles.row, isCurrent && styles.rowCurrent, pressed && styles.pressed]}
              >
                <Text style={[styles.marker, isCurrent && { color: colors.green }]}>{isCurrent ? '▶' : isPast ? '·' : ' '}</Text>
                <View style={styles.meta}>
                  <Text style={[styles.trackTitle, isCurrent && styles.currentText, isPast && styles.pastText]} numberOfLines={1}>
                    {item.track.title}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {item.track.artist}
                  </Text>
                </View>
                {item.track.durationText ? <Text style={styles.dur}>{item.track.durationText}</Text> : null}
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 },
  back: { fontFamily: font.family, fontSize: font.sm, color: colors.accent, width: 48 },
  title: { fontFamily: font.family, fontSize: font.sm, color: colors.text, letterSpacing: 2 },
  saveBtn: { width: 48, alignItems: 'flex-end' },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10 },
  input: { flex: 1, fontFamily: font.family, fontSize: font.sm, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.panelAlt },
  cta: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' },
  note: { fontFamily: font.family, fontSize: font.xs, color: colors.green, paddingBottom: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 6 },
  rowCurrent: { backgroundColor: colors.borderDim },
  pressed: { backgroundColor: colors.panelAlt },
  marker: { fontFamily: font.family, fontSize: font.sm, color: colors.textFaint, width: 16 },
  meta: { flex: 1 },
  trackTitle: { fontFamily: font.family, fontSize: font.sm, color: colors.cyan },
  currentText: { color: colors.text, fontWeight: '700' },
  pastText: { color: colors.textFaint },
  sub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 2 },
  dur: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim },
});
