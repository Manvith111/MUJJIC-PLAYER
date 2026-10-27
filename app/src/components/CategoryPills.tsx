/** Horizontally-scrolling category filter pills (Classic, 90s, New, …). */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { CATEGORIES, useUI, type Category } from '../store/ui';
import { colors, font } from '../theme/terminal';

export function CategoryPills() {
  const query = useUI((s) => s.query);
  const openCategory = useUI((s) => s.openCategory);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {CATEGORIES.map((c: Category) => {
        const active = query === c.label;
        return (
          <Pressable key={c.key} onPress={() => void openCategory(c)} style={[styles.pill, active && styles.pillOn]}>
            <Text style={[styles.text, active && styles.textOn]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 7, paddingRight: 12 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  pillOn: { backgroundColor: colors.accentBg, borderColor: colors.accentBg },
  text: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim },
  textOn: { color: colors.accentInk, fontFamily: font.bold },
});
