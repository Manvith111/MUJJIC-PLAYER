/**
 * Album art with a monochrome placeholder tint and optional terminal corner
 * brackets. Square or circular. Uses the track's remote thumbnail directly.
 */
import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, font, tintFor } from '../theme/terminal';

type Props = {
  uri?: string | null;
  id?: string;
  size: number;
  circle?: boolean;
  brackets?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Artwork({ uri, id, size, circle, brackets, radius = 6, style }: Props) {
  const br = circle ? size / 2 : radius;
  return (
    <View style={[{ width: size, height: size }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: br }} resizeMode="cover" />
      ) : (
        <View
          style={[
            styles.ph,
            { width: size, height: size, borderRadius: br, backgroundColor: tintFor(id ?? uri ?? 'x') },
          ]}
        >
          <Text style={[styles.glyph, { fontSize: Math.max(14, size * 0.32) }]}>♪</Text>
        </View>
      )}
      {brackets ? (
        <>
          <Text style={[styles.br, styles.tl]}>⌜</Text>
          <Text style={[styles.br, styles.trr]}>⌝</Text>
          <Text style={[styles.br, styles.bl]}>⌞</Text>
          <Text style={[styles.br, styles.brr]}>⌟</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ph: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderDim },
  glyph: { fontFamily: font.family, color: colors.textDim },
  br: { position: 'absolute', color: colors.text, fontFamily: font.family, fontSize: 13 },
  tl: { top: 2, left: 4 },
  trr: { top: 2, right: 4 },
  bl: { bottom: 2, left: 4 },
  brr: { bottom: 2, right: 4 },
});
