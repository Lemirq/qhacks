'use client';

import { useEffect, useCallback } from 'react';
import { soundManager, BuildingSoundName } from '@/lib/editor/utils/SoundManager';

/**
 * Hook that preloads building sounds and returns a play function.
 * Sounds are mapped to interactions:
 *   place building        → brick_place
 *   rotate building       → rotate_object
 *   move building         → move_object
 *   resize building       → resize_object
 *   add floor             → add_floor
 *   change wall texture   → change_texture
 *   edit windows          → window_edit
 */
export function useBuildingSound() {
  useEffect(() => {
    console.log('[useBuildingSound] hook mounted, preloading...');
    soundManager.preload();
  }, []);

  const play = useCallback((name: BuildingSoundName) => {
    console.log(`[useBuildingSound] play("${name}") called`);
    soundManager.play(name);
  }, []);

  const setVolume = useCallback((v: number) => {
    soundManager.volume = v;
  }, []);

  const setMuted = useCallback((m: boolean) => {
    soundManager.muted = m;
  }, []);

  return { play, setVolume, setMuted };
}
