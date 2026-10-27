/**
 * Waveform-style seek bar: fixed bars fill white up to the play position; drag
 * or tap to seek. Bar heights are derived from the track id so each song looks
 * distinct but stable.
 */
import React, { useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { colors } from '../theme/terminal';

type Props = {
  fraction: number; // 0..1
  seed: string;
  bars?: number;
  onSeek: (fraction: number) => void;
};

export function WaveScrubber({ fraction, seed, bars = 40, onSeek }: Props) {
  const width = useRef(1);
  const [drag, setDrag] = useState<number | null>(null);

  const heights = useMemo(() => {
    const out: number[] = [];
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) & 0xffff;
    for (let i = 0; i < bars; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      out.push(0.25 + (s % 100) / 100 * 0.75);
    }
    return out;
  }, [seed, bars]);

  const shown = drag ?? Math.max(0, Math.min(1, fraction));

  const fracAt = (e: GestureResponderEvent) => Math.max(0, Math.min(1, e.nativeEvent.locationX / width.current));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => (width.current = Math.max(1, e.nativeEvent.layout.width))}
      style={styles.wrap}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => setDrag(fracAt(e))}
      onResponderMove={(e) => setDrag(fracAt(e))}
      onResponderRelease={(e) => {
        const f = fracAt(e);
        setDrag(null);
        onSeek(f);
      }}
    >
      {heights.map((h, i) => {
        const played = i / bars <= shown;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              marginHorizontal: 1,
              height: `${h * 100}%`,
              backgroundColor: played ? colors.accent : colors.border,
              borderRadius: 1,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', height: 34 },
});
