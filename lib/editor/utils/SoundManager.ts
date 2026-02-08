export type BuildingSoundName =
  | 'brick_place'
  | 'rotate_object'
  | 'move_object'
  | 'place_object'
  | 'resize_object'
  | 'add_floor'
  | 'change_texture'
  | 'window_edit'
  | 'window_add';

const SOUND_FILES: Record<BuildingSoundName, string> = {
  brick_place: '/sounds/building/brick_place.mp3',
  rotate_object: '/sounds/building/rotate_object.mp3',
  move_object: '/sounds/building/move_object.mp3',
  place_object: '/sounds/building/place_object.mp3',
  resize_object: '/sounds/building/resize_object.mp3',
  add_floor: '/sounds/building/add_floor.mp3',
  change_texture: '/sounds/building/change_texture.mp3',
  window_edit: '/sounds/building/window_edit.mp3',
  window_add: '/sounds/building/window_add.mp3',
};

// Cooldown per sound to prevent spam (ms)
const COOLDOWNS: Partial<Record<BuildingSoundName, number>> = {
  // Slider-driven sounds need longer cooldown so they don't overlap
  resize_object: 300,
  move_object: 300,
  rotate_object: 300,
  add_floor: 400,
  window_add: 400,
};
const DEFAULT_COOLDOWN = 100;

class SoundManager {
  private cache: Map<BuildingSoundName, HTMLAudioElement> = new Map();
  private lastPlayed: Map<BuildingSoundName, number> = new Map();
  private activePlaying: Map<BuildingSoundName, HTMLAudioElement> = new Map();
  private _volume = 0.8;
  private _muted = false;
  private loaded = false;

  /** Preload all sound files into cache */
  preload(): void {
    if (this.loaded) {
      console.log('[SoundManager] already loaded, skipping preload');
      return;
    }
    console.log('[SoundManager] preloading all sounds...');
    for (const [name, path] of Object.entries(SOUND_FILES)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = this._volume;
      this.cache.set(name as BuildingSoundName, audio);
      console.log(`[SoundManager] cached "${name}" → ${path}`);
    }
    this.loaded = true;
    console.log(`[SoundManager] preload complete, ${this.cache.size} sounds cached`);
  }

  /** Play a sound by name. Returns false if on cooldown or muted. */
  play(name: BuildingSoundName): boolean {
    console.log(`[SoundManager] play("${name}") called — muted=${this._muted}, loaded=${this.loaded}, cacheSize=${this.cache.size}`);

    if (this._muted) {
      console.log(`[SoundManager] BLOCKED: muted`);
      return false;
    }

    // Lazy preload
    if (!this.loaded) this.preload();

    // Cooldown check
    const cooldown = COOLDOWNS[name] ?? DEFAULT_COOLDOWN;
    const now = Date.now();
    const last = this.lastPlayed.get(name) ?? 0;
    if (now - last < cooldown) {
      console.log(`[SoundManager] BLOCKED: cooldown (${now - last}ms < ${cooldown}ms)`);
      return false;
    }
    this.lastPlayed.set(name, now);

    const cached = this.cache.get(name);
    if (!cached) {
      console.log(`[SoundManager] BLOCKED: no cached audio for "${name}"`);
      return false;
    }

    // Stop any currently playing instance of this sound
    const active = this.activePlaying.get(name);
    if (active) {
      active.pause();
      active.currentTime = 0;
    }

    // Clone node for fresh playback
    const clone = cached.cloneNode() as HTMLAudioElement;
    clone.volume = this._volume;
    this.activePlaying.set(name, clone);
    clone.addEventListener('ended', () => {
      if (this.activePlaying.get(name) === clone) {
        this.activePlaying.delete(name);
      }
    });
    clone.play().catch((err) => {
      console.warn(`[SoundManager] Failed to play "${name}":`, err.message);
    });
    return true;
  }

  /** Set volume (0 to 1) */
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    for (const audio of this.cache.values()) {
      audio.volume = this._volume;
    }
  }

  get volume(): number {
    return this._volume;
  }

  /** Mute / unmute */
  set muted(m: boolean) {
    this._muted = m;
  }

  get muted(): boolean {
    return this._muted;
  }
}

// Singleton instance
export const soundManager = new SoundManager();
