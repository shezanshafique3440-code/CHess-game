import { describe, expect, it } from 'vitest';
import {
  clockPresets,
  createClock,
  tickClock,
  completeClockTurn,
  formatTime,
  type Preset,
} from './clock';
describe('chess clock', () => {
  it.each(Object.keys(clockPresets) as Preset[])(
    'initializes %s in milliseconds without running',
    (preset) => {
      const clock = createClock(preset, 'w', 1000);
      expect(clock.w).toBe(clockPresets[preset][0] * 1000);
      expect(clock.b).toBe(clock.w);
      expect(tickClock(clock, 9000)).toEqual(clock);
    },
  );
  it('charges only the active side, including background elapsed time', () => {
    const clock = { ...createClock('5+0', 'b', 1000), running: true };
    const next = tickClock(clock, 31000);
    expect(next.b).toBe(270000);
    expect(next.w).toBe(300000);
  });
  it('switches sides and adds Fischer increment exactly once', () => {
    const clock = { ...createClock('3+2', 'w', 1000), running: true };
    const next = completeClockTurn(clock, 'w', 4000);
    expect(next.w).toBe(179000);
    expect(next.b).toBe(180000);
    expect(next.active).toBe('b');
    expect(completeClockTurn(next, 'w', 4000)).toEqual(next);
  });
  it('starts on first move and applies its increment', () => {
    const next = completeClockTurn(createClock('15+10', 'w', 0), 'w', 50000);
    expect(next.w).toBe(910000);
    expect(next.running).toBe(true);
    expect(next.active).toBe('b');
  });
  it('flags at zero before an increment can rescue a late move', () => {
    const clock = { ...createClock('1+0', 'w', 0), running: true };
    const next = completeClockTurn(clock, 'w', 60000);
    expect(next.w).toBe(0);
    expect(next.flagged).toBe('w');
    expect(next.active).toBe('w');
    expect(next.running).toBe(false);
  });
  it('never produces negative time or recharges a stopped clock', () => {
    const next = tickClock(
      { ...createClock('1+0', 'b', 0), running: true },
      120000,
    );
    expect(next.b).toBe(0);
    expect(tickClock(next, 150000)).toEqual(next);
  });
  it('does not add time when the system clock goes backwards', () => {
    const clock = { ...createClock('5+0', 'w', 5000), running: true };
    expect(tickClock(clock, 2000).w).toBe(300000);
    expect(tickClock(clock, 2000).stamp).toBe(5000);
  });
  it('formats boundaries clearly', () => {
    expect(formatTime(60000)).toBe('1:00');
    expect(formatTime(1)).toBe('0:01');
    expect(formatTime(0)).toBe('0:00');
  });
});
