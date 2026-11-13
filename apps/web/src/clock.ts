import type { Color } from 'chess.js';
export const clockPresets = {
  '1+0': [60, 0],
  '3+2': [180, 2],
  '5+0': [300, 0],
  '10+0': [600, 0],
  '15+10': [900, 10],
} as const;
export type Preset = keyof typeof clockPresets;
export interface ClockState {
  preset: Preset;
  w: number;
  b: number;
  active: Color;
  running: boolean;
  stamp: number;
  flagged: Color | null;
}
export function createClock(
  preset: Preset,
  active: Color = 'w',
  now = Date.now(),
): ClockState {
  return {
    preset,
    w: clockPresets[preset][0] * 1000,
    b: clockPresets[preset][0] * 1000,
    active,
    running: false,
    stamp: now,
    flagged: null,
  };
}
export function tickClock(clock: ClockState, now: number): ClockState {
  if (!clock.running) return clock;
  const remaining = Math.max(
    0,
    clock[clock.active] - Math.max(0, now - clock.stamp),
  );
  return {
    ...clock,
    [clock.active]: remaining,
    stamp: Math.max(now, clock.stamp),
    running: remaining > 0,
    flagged: remaining === 0 ? clock.active : null,
  };
}
export function completeClockTurn(
  clock: ClockState,
  color: Color,
  now: number,
): ClockState {
  const next = tickClock(clock, now);
  if (next.flagged || color !== next.active) return next;
  return {
    ...next,
    [color]: next[color] + clockPresets[next.preset][1] * 1000,
    active: color === 'w' ? 'b' : 'w',
    running: true,
    stamp: now,
  };
}
export function formatTime(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
