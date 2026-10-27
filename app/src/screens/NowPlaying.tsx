/** Full-screen player: vinyl (swipe = change song, rotate = seek) + a bottom bar of
 *  UP NEXT / LYRICS / RELATED that expands into a panel (YouTube-Music style). */
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { api, type Track } from '../api/client';
import { playList } from '../audio/actions';
import { cycleRepeat, enqueue, next, previous, seekTo, togglePlay, toggleShuffle, usePlayer } from '../audio/player';
import { LyricsView } from '../components/LyricsView';
import { UpNextList } from '../components/UpNextList';
import { VinylPlayer } from '../components/VinylPlayer';
import { WaveScrubber } from '../components/WaveScrubber';
import { pushHistory, toggleFavorite, useLibrary } from '../db/library';
import { colors, font } from '../theme/terminal';
import { formatTime } from '../utils/format';
import { useMenu } from '../store/menu';
import { useSettings } from '../store/settings';
import { useUI } from '../store/ui';

type Panel = 'upnext' | 'lyrics' | 'related' | null;
const SECONDS_PER_TURN = 90;

export function NowPlaying() {
  const { width } = useWindowDimensions();
  const setView = useUI((s) => s.setView);
  const openMenu = useMenu((s) => s.open);
  const vinylGesture = useSettings((s) => s.vinylGesture);
  const { current, isPlaying, position, duration, repeat, shuffle } = usePlayer();
  const fav = useLibrary((s) => (current ? s.isFavorite(current.id) : false));
  const onFav = () => current && void toggleFavorite(current).then(() => useLibrary.getState().refreshFavorites());

  const [panel, setPanel] = useState<Panel>(null);
  const [scrub, setScrub] = useState<number | null>(null); // live seek preview from the vinyl
  const [related, setRelated] = useState<{ id: string; items: Track[]; loading: boolean }>({ id: '', items: [], loading: false });

  const total = duration || current?.duration || 0;
  // While scrubbing, everything (clock + wave) reflects the preview, so what you
  // see is exactly what will play when you let go.
  const shownPos = scrub ?? position;
  const frac = total > 0 ? shownPos / total : 0;
  const vinyl = Math.min(width - 96, 300);

  // Related follows the now-playing song.
  useEffect(() => {
    if (panel !== 'related' || !current) return;
    if (related.id === current.id) return;
    setRelated({ id: current.id, items: [], loading: true });
    api.recommend(current.id, 25)
      .then((items) => setRelated({ id: current.id, items, loading: false }))
      .catch(() => setRelated({ id: current.id, items: [], loading: false }));
  }, [panel, current?.id]);

  // Full-screen horizontal swipe on the art area: left → next, right → previous.
  // Only claims the gesture when it's clearly horizontal, so vertical taps and the
  // vinyl's own rotate/scrub gesture keep working.
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dx) < 50) return;
        g.dx < 0 ? void next() : void previous();
      },
    }),
  ).current;

  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <Pressable onPress={() => setView('home')} hitSlop={10}>
          <Ionicons name="chevron-down" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>NOW PLAYING</Text>
        <Pressable onPress={() => current && openMenu(current, { sleep: true })} hitSlop={10}>
          <MaterialIcons name="more-vert" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.vinylWrap} {...swipe.panHandlers}>
        <VinylPlayer
          size={vinyl}
          uri={current ? api.artworkUrlSync(current.id) : undefined}
          id={current?.id}
          fraction={frac}
          duration={total}
          secondsPerTurn={SECONDS_PER_TURN}
          spinning={isPlaying}
          gesture={vinylGesture}
          onSeek={(secs) => seekTo(secs)}
          onScrub={setScrub}
          onNext={() => void next()}
          onPrevious={() => void previous()}
        />
      </View>

      <View style={styles.titleRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.trackTitle} numberOfLines={1}>{current?.title ?? 'Nothing playing'}</Text>
          <Text style={styles.artist} numberOfLines={1}>{current?.artist ?? 'search to begin'}</Text>
        </View>
        <Pressable onPress={onFav} hitSlop={12} style={styles.likeBtn}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={26} color={fav ? colors.text : colors.textDim} />
        </Pressable>
      </View>

      <WaveScrubber fraction={frac} seed={current?.id ?? 'none'} onSeek={(f) => seekTo(f * total)} />
      <View style={styles.times}>
        <Text style={[styles.time, scrub != null && styles.timeActive]}>{formatTime(shownPos)}</Text>
        <Text style={styles.time}>{formatTime(total)}</Text>
      </View>

      <View style={styles.transport}>
        <Pressable onPress={toggleShuffle} hitSlop={10}>
          <MaterialIcons name="shuffle" size={24} color={shuffle ? colors.text : colors.textFaint} />
        </Pressable>
        <Pressable onPress={() => void previous()} hitSlop={10}>
          <MaterialIcons name="skip-previous" size={36} color={colors.text} />
        </Pressable>
        <Pressable onPress={togglePlay} style={styles.bigBtn}>
          <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={38} color={colors.accentInk} />
        </Pressable>
        <Pressable onPress={() => void next()} hitSlop={10}>
          <MaterialIcons name="skip-next" size={36} color={colors.text} />
        </Pressable>
        <Pressable onPress={cycleRepeat} hitSlop={10}>
          <MaterialIcons name={repeat === 'one' ? 'repeat-one' : 'repeat'} size={24} color={repeat !== 'off' ? colors.text : colors.textFaint} />
        </Pressable>
      </View>

      <View style={styles.bottomTabs}>
        {(['upnext', 'lyrics', 'related'] as Panel[]).map((k) => (
          <Pressable key={k} onPress={() => setPanel(k)} style={styles.bottomTab} hitSlop={8}>
            <Text style={styles.bottomTabText}>{k === 'upnext' ? 'UP NEXT' : k === 'lyrics' ? 'LYRICS' : 'RELATED'}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPanel(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <View style={styles.sheetTabs}>
                {(['upnext', 'lyrics', 'related'] as Panel[]).map((k) => (
                  <Pressable key={k} onPress={() => setPanel(k)}>
                    <Text style={[styles.sheetTab, panel === k && styles.sheetTabOn]}>
                      {k === 'upnext' ? 'UP NEXT' : k === 'lyrics' ? 'LYRICS' : 'RELATED'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setPanel(null)} hitSlop={10}>
                <Ionicons name="chevron-down" size={22} color={colors.textDim} />
              </Pressable>
            </View>

            <View style={styles.sheetBody}>
              {panel === 'lyrics' ? (
                <LyricsView trackId={current?.id} />
              ) : panel === 'upnext' ? (
                <UpNextList onClose={() => setPanel(null)} />
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                  {related.loading ? (
                    <ActivityIndicator color={colors.text} style={{ marginTop: 16 }} />
                  ) : related.items.length ? (
                    related.items.map((t, i) => (
                      <View key={`${t.id}:${i}`} style={styles.row}>
                        <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => { void playList(related.items, i); void pushHistory(t); }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>{t.title}</Text>
                          <Text style={styles.rowSub} numberOfLines={1}>{t.artist}</Text>
                        </Pressable>
                        <Pressable onPress={() => enqueue([t])} hitSlop={8} style={styles.plus}>
                          <MaterialIcons name="add" size={20} color={colors.accentInk} />
                        </Pressable>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.hint}>no related tracks</Text>
                  )}
                </ScrollView>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  title: { fontFamily: font.display, fontSize: 11, color: colors.text, letterSpacing: 1 },
  vinylWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  trackTitle: { fontFamily: font.bold, fontSize: font.lg, color: colors.text },
  artist: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim, marginTop: 3 },
  likeBtn: { padding: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  time: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim },
  timeActive: { color: colors.text },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 14 },
  bigBtn: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' },
  bottomTabs: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.borderDim },
  bottomTab: { paddingHorizontal: 8 },
  bottomTabText: { fontFamily: font.display, fontSize: 10, color: colors.textDim, letterSpacing: 1 },
  backdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.panel, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: colors.border, height: '72%', paddingHorizontal: 16, paddingTop: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.borderDim },
  sheetTabs: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  sheetTab: { fontFamily: font.display, fontSize: 10, color: colors.textFaint, letterSpacing: 1, paddingVertical: 2 },
  sheetTabOn: { color: colors.text },
  sheetBody: { flex: 1, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.borderDim },
  rowTitle: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  rowSub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 2 },
  plus: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accentBg, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim, textAlign: 'center', marginTop: 16 },
});
