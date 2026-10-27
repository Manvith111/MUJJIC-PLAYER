/**
 * Lyrics that follow the song: pulls time-synced LRC (via /synced), highlights the
 * current line and auto-scrolls. Falls back to plain (translated) lyrics when no
 * synced version exists. A toggle switches between English and the original.
 */
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import { usePlayer } from '../audio/player';
import { colors, font } from '../theme/terminal';

type Line = { t: number; text: string };

function parseLRC(lrc: string): Line[] {
  const out: Line[] = [];
  for (const raw of lrc.split('\n')) {
    const times = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of times) out.push({ t: parseInt(m[1], 10) * 60 + parseFloat(m[2]), text });
  }
  return out.sort((a, b) => a.t - b.t);
}

export function LyricsView({ trackId }: { trackId?: string }) {
  const position = usePlayer((s) => s.position);
  const [synced, setSynced] = useState<Line[] | null>(null);
  const [plain, setPlain] = useState<{ english: string; original: string; translated: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const scroller = useRef<ScrollView>(null);
  const lineYs = useRef<number[]>([]);
  const userScrolledAt = useRef(0);

  useEffect(() => {
    if (!trackId) return;
    let cancelled = false;
    setLoading(true);
    setSynced(null);
    setPlain(null);
    setShowOriginal(false);
    (async () => {
      try {
        const s = await api.synced(trackId);
        if (!cancelled && s.synced) {
          setSynced(parseLRC(s.synced));
          setLoading(false);
          return;
        }
      } catch {
        // no synced — fall back to plain
      }
      try {
        const l = await api.lyrics(trackId);
        if (!cancelled) setPlain({ english: l.english, original: l.original, translated: l.translated });
      } catch {
        if (!cancelled) setPlain(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  const currentIndex = (() => {
    if (!synced) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].t <= position + 0.2) idx = i;
      else break;
    }
    return idx;
  })();

  // Auto-scroll the active line into view (unless the user just scrolled by hand).
  useEffect(() => {
    if (currentIndex < 0 || !scroller.current) return;
    if (Date.now() - userScrolledAt.current < 4000) return;
    const y = lineYs.current[currentIndex];
    if (y != null) scroller.current.scrollTo({ y: Math.max(0, y - 110), animated: true });
  }, [currentIndex]);

  if (loading) return <ActivityIndicator color={colors.text} style={{ marginTop: 20 }} />;

  if (synced) {
    return (
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => (userScrolledAt.current = Date.now())}
        onMomentumScrollBegin={() => (userScrolledAt.current = Date.now())}
        contentContainerStyle={styles.body}
      >
        {synced.map((l, i) => (
          <Text
            key={i}
            onLayout={(e) => (lineYs.current[i] = e.nativeEvent.layout.y)}
            style={[styles.line, i === currentIndex ? styles.active : i < currentIndex ? styles.past : styles.future]}
          >
            {l.text || '♪'}
          </Text>
        ))}
        <View style={{ height: 60 }} />
      </ScrollView>
    );
  }

  if (plain) {
    const text = showOriginal ? plain.original : plain.english;
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {plain.translated ? (
          <Pressable onPress={() => setShowOriginal((v) => !v)} style={styles.langBtn}>
            <MaterialIcons name="translate" size={16} color={colors.accentInk} />
            <Text style={styles.langText}>{showOriginal ? 'Show English' : 'Show original'}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.plain}>{text}</Text>
      </ScrollView>
    );
  }

  return <Text style={styles.hint}>no lyrics found for this track</Text>;
}

const styles = StyleSheet.create({
  body: { paddingVertical: 8 },
  line: { fontFamily: font.family, fontSize: font.md, lineHeight: 30, paddingVertical: 3 },
  active: { color: colors.text, fontFamily: font.bold },
  past: { color: colors.textFaint },
  future: { color: colors.textDim },
  langBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.accentBg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 10 },
  langText: { fontFamily: font.bold, fontSize: font.xs, color: colors.accentInk },
  plain: { fontFamily: font.family, fontSize: font.sm, color: colors.text, lineHeight: 22, paddingBottom: 20 },
  hint: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim, textAlign: 'center', marginTop: 20 },
});
