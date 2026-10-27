/** Terminal-style search input shared by Home and Search. */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, font } from '../theme/terminal';
import { useUI } from '../store/ui';

export function SearchBar({ autoFocus }: { autoFocus?: boolean }) {
  const { query, setQuery, runSearch } = useUI();
  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>❯</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => void runSearch()}
        placeholder="search for songs, artists"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
      />
      {query ? (
        <Pressable onPress={() => setQuery('')} hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.textDim} />
        </Pressable>
      ) : (
        <Ionicons name="search" size={17} color={colors.textDim} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: colors.panel,
  },
  prompt: { fontFamily: font.family, fontSize: font.md, color: colors.text },
  input: { flex: 1, fontFamily: font.family, fontSize: font.sm, color: colors.text, paddingVertical: 9 },
});
