import {
  clockPresets,
  formatTime,
  type ClockState,
  type Preset,
} from '../clock';
import type { Copy } from '../i18n';
export function ClockPanel({
  clock,
  t,
  disabled,
  ended,
  onPreset,
  onStart,
}: {
  clock: ClockState;
  t: Copy;
  disabled: boolean;
  ended: boolean;
  onPreset: (preset: Preset) => void;
  onStart: () => void;
}) {
  return (
    <section className="clock-panel card">
      <h2>{t.clock}</h2>
      <div className="clock-pair" dir="ltr">
        {(['w', 'b'] as const).map((color) => (
          <div
            key={color}
            className={`clock-face ${clock.active === color && clock.running ? 'ticking' : ''} ${clock[color] < 10000 ? 'low-time' : ''}`}
          >
            <span>{color === 'w' ? t.white : t.black}</span>
            <time aria-label={color === 'w' ? t.white : t.black}>
              {formatTime(clock[color])}
            </time>
          </div>
        ))}
      </div>
      <label>
        {t.timeControl}
        <select
          aria-label={t.timeControl}
          value={clock.preset}
          disabled={disabled}
          onChange={(e) => onPreset(e.target.value as Preset)}
        >
          {Object.keys(clockPresets).map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
      </label>
      {!clock.running && !ended && (
        <button className="text-button" onClick={onStart}>
          {t.startClock}
        </button>
      )}
      <p>{t.clockNote}</p>
    </section>
  );
}
