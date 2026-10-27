/**
 * Source tabs shown as "PL - TR - AL - AR" with the active one highlighted in a
 * violet chip, matching the reference header.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '../theme/terminal';

export type TabKey = 'playlists' | 'tracks' | 'albums' | 'artists';

export const TABS: { key: TabKey; short: string; label: string }[] = [
  { key: 'playlists', short: 'PL', label: 'Playlists' },
  { key: 'tracks', short: 'TR', label: 'Tracks' },
  { key: 'albums', short: 'AL', label: 'Albums' },
  { key: 'artists', short: 'AR', label: 'Artists' },
];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <View style={styles.row}>
      {TABS.map((t, i) => (
        <React.Fragment key={t.key}>
          {i > 0 ? <Text style={styles.sep}>-</Text> : null}
          <Pressable onPress={() => onChange(t.key)} hitSlop={8}>
            <Text style={[styles.tab, active === t.key ? styles.tabActive : null]}>{t.short}</Text>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tab: {
    fontFamily: font.family,
    fontSize: font.sm,
    color: colors.textFaint,
    letterSpacing: 1,
  },
  tabActive: {
    color: colors.text,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  sep: {
    fontFamily: font.family,
    fontSize: font.sm,
    color: colors.textFaint,
  },
});
