import { useEffect, useRef, useState } from 'react';
import type { Color } from 'chess.js';
import {
  clockPresets,
  completeClockTurn,
  createClock,
  tickClock,
  type ClockState,
  type Preset,
} from '../clock';
import { getSetting, saveSetting } from '../game';
interface SavedClock {
  pgn: string;
  clock: ClockState;
  history: ClockState[];
}
function restore(pgn: string, active: Color): SavedClock {
  try {
    const saved = JSON.parse(
      getSetting('sangat-clock', 'null'),
    ) as SavedClock | null;
    const valid = (c: ClockState) =>
      c &&
      c.preset in clockPresets &&
      ['w', 'b'].includes(c.active) &&
      typeof c.running === 'boolean' &&
      [c.w, c.b, c.stamp].every((n) => Number.isFinite(n) && n >= 0) &&
      [null, 'w', 'b'].includes(c.flagged);
    if (
      saved?.pgn === pgn &&
      valid(saved.clock) &&
      Array.isArray(saved.history) &&
      saved.history.every(valid)
    )
      return { ...saved, clock: tickClock(saved.clock, Date.now()) };
  } catch {
    /* Invalid or unavailable saved clock. */
  }
  const preset = getSetting('sangat-preset', '5+0');
  return {
    pgn,
    clock: createClock(
      preset in clockPresets ? (preset as Preset) : '5+0',
      active,
    ),
    history: [],
  };
}
export function useClock(pgn: string, active: Color) {
  const [initial] = useState(() => restore(pgn, active));
  const clockRef = useRef(initial.clock);
  const history = useRef(initial.history);
  const [clock, setClock] = useState(initial.clock);
  const publish = (next: ClockState) => {
    clockRef.current = next;
    setClock(next);
    return next;
  };
  useEffect(() => {
    const timer = setInterval(() => {
      const next = tickClock(clockRef.current, Date.now());
      if (next.flagged) clockRef.current = next;
      setClock(next);
    }, 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    saveSetting(
      'sangat-clock',
      JSON.stringify({
        pgn,
        clock: clockRef.current,
        history: history.current,
      }),
    );
  }, [pgn, clock.running, clock.flagged, clock.preset]);
  return {
    clock,
    current: () => tickClock(clockRef.current, Date.now()),
    start: () => {
      if (!clockRef.current.running && !clockRef.current.flagged)
        publish({ ...clockRef.current, running: true, stamp: Date.now() });
    },
    complete: (color: Color) => {
      const now = Date.now();
      const before = tickClock(clockRef.current, now);
      if (before.flagged || before.active !== color) {
        publish(before);
        return false;
      }
      history.current.push(before);
      publish(completeClockTurn(before, color, now));
      return true;
    },
    stop: () => {
      const next = tickClock(clockRef.current, Date.now());
      publish({ ...next, running: false });
    },
    reset: (preset: Preset, color: Color) => {
      history.current = [];
      saveSetting('sangat-preset', preset);
      publish(createClock(preset, color));
    },
    undo: (count: number, color: Color) => {
      let next: ClockState | undefined;
      while (count-- > 0) next = history.current.pop();
      publish(
        next
          ? { ...next, stamp: Date.now(), flagged: null }
          : createClock(clockRef.current.preset, color),
      );
    },
  };
}
