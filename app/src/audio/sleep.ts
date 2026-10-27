/**
 * Sleep timer: pauses playback after N minutes. Counts down once per second and
 * exposes remaining seconds to the UI.
 */
import { create } from 'zustand';

import { togglePlay, usePlayer } from './player';

type SleepStore = {
  remaining: number | null; // seconds, or null when off
  set: (minutes: number) => void;
  cancel: () => void;
};

let handle: ReturnType<typeof setInterval> | null = null;

function stopTimer() {
  if (handle) {
    clearInterval(handle);
    handle = null;
  }
}

export const useSleep = create<SleepStore>((set, get) => ({
  remaining: null,
  set: (minutes) => {
    stopTimer();
    if (minutes <= 0) {
      set({ remaining: null });
      return;
    }
    set({ remaining: Math.round(minutes * 60) });
    handle = setInterval(() => {
      const r = get().remaining;
      if (r == null) {
        stopTimer();
        return;
      }
      if (r <= 1) {
        stopTimer();
        set({ remaining: null });
        // Pause playback when the timer elapses.
        if (usePlayer.getState().isPlaying) togglePlay();
        return;
      }
      set({ remaining: r - 1 });
    }, 1000);
  },
  cancel: () => {
    stopTimer();
    set({ remaining: null });
  },
}));
