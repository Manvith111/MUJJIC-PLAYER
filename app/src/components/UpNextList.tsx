/**
 * The full play queue for Now Playing — shows every track (played, current,
 * upcoming) so nothing vanishes when you jump around. Grab the ≡ handle and drag
 * to reorder, swipe a row left/right to remove it, tap ⋮ for its menu, and use
 * "load more" to append related tracks. Built on core RN (Animated + PanResponder)
 * so it stays light and reliable across web + native.
 */
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { jumpTo, loadMoreQueue, removeAtOrderPos, setQueueOrder, usePlayer } from '../audio/player';
import { colors, font } from '../theme/terminal';
import { useMenu } from '../store/menu';

const ROW_H = 62;

export function UpNextList({ onClose }: { onClose: () => void }) {
  const queue = usePlayer((s) => s.queue);
  const order = usePlayer((s) => s.order);
  const orderPos = usePlayer((s) => s.orderPos);
  const openMenu = useMenu((s) => s.open);

  const [local, setLocal] = useState<number[]>(order);
  const [dragKey, setDragKey] = useState<number | null>(null);
  const [dragDy, setDragDy] = useState(0); // live finger offset for the held row
  const [loadingMore, setLoadingMore] = useState(false);
  const dragging = dragKey !== null;
  const base = useRef<number[]>(order); // order captured at drag start
  const startPos = useRef(0); // held row's index when the drag started

  // Keep the local order in sync with the player when we're not mid-drag.
  useEffect(() => {
    if (!dragging) setLocal(order);
  }, [order, dragging]);

  const startDrag = (queueIndex: number) => {
    base.current = [...local];
    startPos.current = local.indexOf(queueIndex);
    setDragDy(0);
    setDragKey(queueIndex);
  };
  const moveDrag = (dy: number) => {
    if (dragKey === null) return;
    setDragDy(dy);
    const delta = Math.round(dy / ROW_H);
    const target = Math.max(0, Math.min(base.current.length - 1, startPos.current + delta));
    const without = base.current.filter((qi) => qi !== dragKey);
    without.splice(target, 0, dragKey);
    setLocal(without);
  };
  const endDrag = () => {
    if (dragKey === null) return;
    setQueueOrder(local);
    setDragKey(null);
    setDragDy(0);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    await loadMoreQueue();
    setLoadingMore(false);
  };

  return (
    <ScrollView scrollEnabled={!dragging} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {local.length === 0 ? (
        <Text style={styles.hint}>queue is empty — play something first</Text>
      ) : (
        local.map((queueIndex) => {
          const track = queue[queueIndex];
          if (!track) return null;
          const pos = local.indexOf(queueIndex);
          const isDragging = dragKey === queueIndex;
          // Cancel out the layout jump so the held row tracks the finger exactly.
          const dragTranslateY = isDragging ? dragDy - (pos - startPos.current) * ROW_H : 0;
          return (
            <QueueRow
              key={queueIndex}
              track={track}
              isCurrent={pos === orderPos}
              isPast={pos < orderPos}
              isDragging={isDragging}
              dragTranslateY={dragTranslateY}
              onTap={() => { void jumpTo(queueIndex); onClose(); }}
              onRemove={() => removeAtOrderPos(local.indexOf(queueIndex))}
              onMenu={() => openMenu(track)}
              onDragStart={() => startDrag(queueIndex)}
              onDragMove={moveDrag}
              onDragEnd={endDrag}
            />
          );
        })
      )}
      <Pressable onPress={loadMore} style={styles.loadMore} disabled={loadingMore}>
        <Ionicons name="refresh" size={16} color={colors.textDim} />
        <Text style={styles.loadMoreText}>{loadingMore ? 'loading…' : 'load more'}</Text>
      </Pressable>
    </ScrollView>
  );
}

type RowProps = {
  track: { title: string; artist: string };
  isCurrent: boolean;
  isPast: boolean;
  isDragging: boolean;
  dragTranslateY: number;
  onTap: () => void;
  onRemove: () => void;
  onMenu: () => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
};

function QueueRow({ track, isCurrent, isPast, isDragging, dragTranslateY, onTap, onRemove, onMenu, onDragStart, onDragMove, onDragEnd }: RowProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  // Horizontal swipe on the row body → remove.
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dx) > 110) {
          Animated.timing(translateX, { toValue: g.dx > 0 ? 400 : -400, duration: 150, useNativeDriver: true }).start(onRemove);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  // Vertical drag on the ≡ handle → reorder.
  const drag = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: onDragStart,
      onPanResponderMove: (_e, g) => onDragMove(g.dy),
      onPanResponderRelease: onDragEnd,
      onPanResponderTerminate: onDragEnd,
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.rowWrap,
        isDragging && styles.dragging,
        { transform: [{ translateX }, { translateY: dragTranslateY }] },
        isDragging && { zIndex: 10, elevation: 6 },
      ]}
    >
      <View style={styles.handle} {...drag.panHandlers}>
        <MaterialIcons name="drag-indicator" size={22} color={colors.textFaint} />
      </View>
      <Pressable style={styles.body} onPress={onTap} {...swipe.panHandlers}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, isCurrent && styles.titleCurrent, isPast && styles.past]} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>{track.artist}</Text>
        </View>
        {isCurrent ? <MaterialIcons name="graphic-eq" size={18} color={colors.text} /> : null}
      </Pressable>
      <Pressable onPress={onMenu} hitSlop={8} style={styles.kebab}>
        <MaterialIcons name="more-vert" size={20} color={colors.textDim} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDim,
  },
  dragging: { backgroundColor: colors.panelAlt, borderRadius: 8 },
  handle: { paddingHorizontal: 6, height: '100%', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: '100%' },
  title: { fontFamily: font.family, fontSize: font.sm, color: colors.text },
  titleCurrent: { fontFamily: font.bold },
  past: { color: colors.textFaint },
  sub: { fontFamily: font.family, fontSize: font.xs, color: colors.textDim, marginTop: 2 },
  kebab: { padding: 6 },
  loadMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadMoreText: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim },
  hint: { fontFamily: font.family, fontSize: font.sm, color: colors.textDim, textAlign: 'center', marginTop: 20 },
});
