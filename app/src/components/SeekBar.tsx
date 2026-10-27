/**
 * A minimal, dependency-free seek/progress bar. Tap or drag anywhere on the
 * track to seek. Used for both playback position and volume.
 */
import React, { useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../theme/terminal';

type Props = {
  value: number; // 0..1
  onSeek: (fraction: number) => void;
  onSeekStart?: () => void;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function SeekBar({ value, onSeek, onSeekStart, color, height = 6, style }: Props) {
  const widthRef = useRef(1);
  const [dragFrac, setDragFrac] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = Math.max(1, e.nativeEvent.layout.width);
  };

  const frac = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    return Math.max(0, Math.min(1, x / widthRef.current));
  };

  const shown = dragFrac ?? Math.max(0, Math.min(1, value));

  return (
    <View
      onLayout={onLayout}
      style={[styles.wrap, { height: Math.max(height, 16) }, style]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        onSeekStart?.();
        setDragFrac(frac(e));
      }}
      onResponderMove={(e) => setDragFrac(frac(e))}
      onResponderRelease={(e) => {
        const f = frac(e);
        setDragFrac(null);
        onSeek(f);
      }}
    >
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { width: `${shown * 100}%`, backgroundColor: color ?? colors.accent, height }]} />
        <View style={[styles.thumb, { left: `${shown * 100}%`, backgroundColor: color ?? colors.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  track: {
    backgroundColor: colors.borderDim,
    borderRadius: 999,
    overflow: 'visible',
    justifyContent: 'center',
  },
  fill: { borderRadius: 999 },
  thumb: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    top: -2,
  },
});
