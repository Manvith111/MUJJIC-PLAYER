/** A lightweight row for albums / artists / playlists results. */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '../theme/terminal';

export function SimpleRow({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.dot}>▹</Text>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 6 },
  pressed: { backgroundColor: colors.panelAlt },
  dot: { fontFamily: font.family, color: colors.accent, fontSize: font.sm },
  meta: { flex: 1 },
  title: { fontFamily: font.family, fontSize: font.sm, color: colors.cyan },
  sub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 2 },
});
