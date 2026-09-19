/** Session-only inspection of the authored Earth loop, separate from sky time. */
export const MIN_EARTH_PLAYBACK_SPEED = 1;
export const MAX_EARTH_PLAYBACK_SPEED = 60;

export type EarthPlaybackState = {
  /** Seconds within one loop; an explicit seek to the end retains duration. */
  time: number;
  duration: number;
  /** Multiplier relative to the approved Earth motion, not the original rate. */
  speed: number;
  /** Playback intent; readiness and the global motion/visibility clock still gate it. */
  playing: boolean;
  ready: boolean;
};

export type EarthPlaybackCommand =
  | { type: 'seek'; time: number }
  | { type: 'speed'; speed: number }
  | { type: 'playing'; playing: boolean }
  | { type: 'reset' }
  | { type: 'close' };

export type EarthPlaybackController = {
  getEarthPlayback(): EarthPlaybackState;
  setEarthPlayback(command: EarthPlaybackCommand): void;
};

export function normalizeEarthPlaybackSpeed(speed: number): number {
  return Number.isFinite(speed)
    ? Math.min(
        MAX_EARTH_PLAYBACK_SPEED,
        Math.max(MIN_EARTH_PLAYBACK_SPEED, speed),
      )
    : MIN_EARTH_PLAYBACK_SPEED;
}
