/**
 * Vinyl-record now-playing art. Large, high-clarity circular cover on a grooved
 * disc that spins while playing. Gestures on the disc:
 *   • horizontal swipe  → previous / next track (like Spotify / YT Music)
 *   • rotate (spin)     → scrub within the song; the white ring follows live
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '../theme/terminal';
import { Artwork } from './Artwork';

type Props = {
  size: number;
  uri?: string | null;
  id?: string;
  fraction: number; // 0..1 real playback position
  duration?: number; // seconds, for scrub preview
  secondsPerTurn?: number;
  spinning?: boolean;
  gesture?: boolean; // rotate-to-seek enabled
  onSeek?: (secs: number) => void; // final absolute seek target (matches the preview exactly)
  onScrub?: (secs: number | null) => void; // live preview seconds while rotating, null when done
  onNext?: () => void;
  onPrevious?: () => void;
};

export function VinylPlayer({
  size, uri, id, fraction, duration = 0, secondsPerTurn = 90,
  spinning, gesture, onSeek, onScrub, onNext, onPrevious,
}: Props) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const disc = size - 16;
  const groove = disc - 14;
  const art = Math.round(size * 0.68);

  const spin = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const acc = useRef({ prev: 0, turns: 0 });
  // Frozen playback position (seconds) captured when a scrub starts, so the
  // preview doesn't drift as the song keeps playing under the finger.
  const baseSecs = useRef(0);
  // Latest live values, read inside gesture callbacks (which close over stale props).
  const live = useRef({ fraction, duration });
  live.current = { fraction, duration };
  const [previewSecs, setPreviewSecs] = useState<number | null>(null);

  useEffect(() => {
    if (spinning) {
      loopRef.current = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }),
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
    }
    return () => loopRef.current?.stop();
  }, [spinning, spin]);

  const angleAt = (x: number, y: number) => Math.atan2(y - size / 2, x - size / 2);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: (e) => {
        acc.current = { prev: angleAt(e.nativeEvent.locationX, e.nativeEvent.locationY), turns: 0 };
        const { fraction: f, duration: dur } = live.current;
        baseSecs.current = f * (dur || 0);
      },
      onPanResponderMove: (e) => {
        const a = angleAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
        let d = a - acc.current.prev;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        acc.current.prev = a;
        acc.current.turns += d / (2 * Math.PI);
        drag.setValue(acc.current.turns);
        // Live scrub preview once we're clearly rotating. It's absolute (frozen
        // base + turns), so what the ring/time shows is exactly what we'll seek to.
        const dur = live.current.duration;
        if (gesture && dur > 0 && Math.abs(acc.current.turns) > 0.03) {
          const secs = Math.max(0, Math.min(dur, baseSecs.current + acc.current.turns * secondsPerTurn));
          setPreviewSecs(secs);
          onScrub?.(secs);
        }
      },
      onPanResponderRelease: (_e, g) => {
        const turns = acc.current.turns;
        const dur = live.current.duration;
        Animated.timing(drag, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
        const isSwipe = Math.abs(g.dx) > 60 && Math.abs(turns) < 0.15;
        const secs = previewSecs;
        setPreviewSecs(null);
        onScrub?.(null);
        if (isSwipe) {
          g.dx < 0 ? onNext?.() : onPrevious?.();
        } else if (gesture && dur > 0 && Math.abs(turns) > 0.03 && secs != null) {
          onSeek?.(secs);
        }
      },
    }),
  ).current;

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const dragDeg = drag.interpolate({ inputRange: [-1, 1], outputRange: ['-360deg', '360deg'] });
  const previewFrac = previewSecs != null && duration > 0 ? previewSecs / duration : null;
  const ringFrac = Math.max(0, Math.min(1, previewFrac ?? fraction));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} {...pan.panHandlers}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={previewSecs != null ? '#ffffff' : colors.accent}
          strokeWidth={previewSecs != null ? stroke + 1 : stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ringFrac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <Animated.View
        pointerEvents="none"
        style={[styles.disc, { width: disc, height: disc, borderRadius: disc / 2, transform: [{ rotate: spinDeg }, { rotate: dragDeg }] }]}
      >
        <View style={[styles.groove, { width: groove, height: groove, borderRadius: groove / 2 }]}>
          <Artwork uri={uri} id={id} size={art} circle />
          <View style={styles.spindle} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { backgroundColor: '#0d0d0f', borderWidth: 1, borderColor: colors.borderDim, alignItems: 'center', justifyContent: 'center' },
  groove: { borderWidth: 1, borderColor: '#1a1a1e', alignItems: 'center', justifyContent: 'center' },
  spindle: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
});
