/** Bottom navigation with proper icons: Home · Search · Library · Setup. */
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '../theme/terminal';
import { useUI, type View as UIView } from '../store/ui';

type Item = { view: UIView; label: string; render: (color: string) => React.ReactNode };

const ITEMS: Item[] = [
  { view: 'home', label: 'HOME', render: (c) => <Ionicons name="home" size={20} color={c} /> },
  { view: 'search', label: 'SEARCH', render: (c) => <Ionicons name="search" size={20} color={c} /> },
  { view: 'library', label: 'LIBRARY', render: (c) => <MaterialIcons name="library-music" size={20} color={c} /> },
  { view: 'settings', label: 'SETUP', render: (c) => <Ionicons name="settings-sharp" size={19} color={c} /> },
];

export function BottomNav() {
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const activeFor = (v: UIView) =>
    view === v || (v === 'home' && view === 'nowplaying') || (v === 'search' && view === 'queue');

  return (
    <View style={styles.row}>
      {ITEMS.map((it) => {
        const active = activeFor(it.view);
        const c = active ? colors.text : colors.textFaint;
        return (
          <Pressable key={it.view} onPress={() => setView(it.view)} style={styles.item} hitSlop={6}>
            {it.render(c)}
            <Text style={[styles.label, { color: c }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderDim,
  },
  item: { alignItems: 'center', gap: 3, flex: 1 },
  label: { fontFamily: font.display, fontSize: 8, letterSpacing: 1 },
});
