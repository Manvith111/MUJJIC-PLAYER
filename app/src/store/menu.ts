/** Which track's "⋮" action menu is open (global bottom sheet). */
import { create } from 'zustand';

import type { Track } from '../api/client';

type MenuStore = {
  track: Track | null;
  withSleep: boolean; // show the sleep-timer entry (Now Playing menu)
  open: (t: Track, opts?: { sleep?: boolean }) => void;
  close: () => void;
};

export const useMenu = create<MenuStore>((set) => ({
  track: null,
  withSleep: false,
  open: (t, opts) => set({ track: t, withSleep: !!opts?.sleep }),
  close: () => set({ track: null, withSleep: false }),
}));
