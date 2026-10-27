/** A playlist cover: a mosaic of the first few song thumbnails (1, 2, 3, or 4-up). */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, font } from '../theme/terminal';

const GAP = 1;

export function Collage({ covers, size, radius = 6 }: { covers: string[]; size: number; radius?: number }) {
  const list = covers.filter(Boolean).slice(0, 4);

  if (list.length === 0) {
    return (
      <View style={[styles.ph, { width: size, height: size, borderRadius: radius }]}>
        <Text style={[styles.glyph, { fontSize: size * 0.3 }]}>♪</Text>
      </View>
    );
  }

  // One cover fills the whole banner.
  if (list.length === 1) {
    return <Image source={{ uri: list[0] }} style={{ width: size, height: size, borderRadius: radius }} resizeMode="cover" />;
  }

  // Floor the halves so two tiles + gap never exceed `size` (avoids a rounding
  // wrap that used to collapse the 2×2 grid into a broken vertical strip).
  const half = Math.floor((size - GAP) / 2);

  // Two covers: side-by-side halves.
  if (list.length === 2) {
    return (
      <View style={[styles.grid, { width: size, height: size, borderRadius: radius }]}>
        <Image source={{ uri: list[0] }} style={{ width: half, height: size }} resizeMode="cover" />
        <Image source={{ uri: list[1] }} style={{ width: size - half - GAP, height: size }} resizeMode="cover" />
      </View>
    );
  }

  // Three covers: one tall on the left, two stacked on the right.
  if (list.length === 3) {
    return (
      <View style={[styles.grid, { width: size, height: size, borderRadius: radius }]}>
        <Image source={{ uri: list[0] }} style={{ width: half, height: size }} resizeMode="cover" />
        <View style={{ width: size - half - GAP, height: size, gap: GAP }}>
          <Image source={{ uri: list[1] }} style={{ width: '100%', height: half }} resizeMode="cover" />
          <Image source={{ uri: list[2] }} style={{ width: '100%', height: size - half - GAP }} resizeMode="cover" />
        </View>
      </View>
    );
  }

  // Four covers: a full 2×2 grid.
  return (
    <View style={[styles.grid, { width: size, height: size, borderRadius: radius }]}>
      {list.map((uri, i) => (
        <Image key={i} source={{ uri }} style={{ width: half, height: half }} resizeMode="cover" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ph: { backgroundColor: colors.panelAlt, borderWidth: 1, borderColor: colors.borderDim, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: font.family, color: colors.textDim },
  grid: { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', gap: GAP, backgroundColor: colors.borderDim },
});
