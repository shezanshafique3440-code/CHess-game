import { useEffect, useRef, useState } from 'react';
import type { Move } from 'chess.js';
import { getSetting, saveSetting } from '../game';
type Sound = 'move' | 'capture' | 'check' | 'castle' | 'end';
const notes: Record<Sound, number[]> = {
  move: [440],
  capture: [220, 165],
  check: [660, 880],
  castle: [330, 440, 550],
  end: [523, 659, 784, 1047],
};
export function useSound() {
  const [muted, setMuted] = useState(
    getSetting('sangat-muted', 'false') === 'true',
  );
  const audio = useRef<AudioContext>();
  useEffect(() => {
    const unlock = () => {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume().catch(() => {});
      } catch {
        /* Audio unavailable. */
      }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      void audio.current?.close();
    };
  }, []);
  function play(kind: Sound) {
    if (muted || !audio.current || audio.current.state !== 'running') return;
    const ctx = audio.current;
    notes[kind].forEach((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.09;
      oscillator.type = kind === 'capture' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.09, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.14);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.15);
    });
  }
  return {
    muted,
    toggle: () => {
      saveSetting('sangat-muted', String(!muted));
      setMuted(!muted);
    },
    play,
    move: (move: Move, check: boolean) =>
      play(
        check
          ? 'check'
          : move.isKingsideCastle() || move.isQueensideCastle()
            ? 'castle'
            : move.captured
              ? 'capture'
              : 'move',
      ),
  };
}
