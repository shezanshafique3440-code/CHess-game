import type { Copy } from '../i18n';
export const themes = {
  green: ['#799081', '#ece8da'],
  brown: ['#a27b5c', '#f0dfc5'],
  blue: ['#66869f', '#e3eced'],
} as const;
export type Theme = keyof typeof themes;
export type PieceSet = 'classic' | 'letters';
export function BoardSettings({
  t,
  theme,
  pieces,
  muted,
  onTheme,
  onPieces,
  onMute,
}: {
  t: Copy;
  theme: Theme;
  pieces: PieceSet;
  muted: boolean;
  onTheme: (v: Theme) => void;
  onPieces: (v: PieceSet) => void;
  onMute: () => void;
}) {
  return (
    <section className="board-settings card">
      <h2>{t.appearance}</h2>
      <label>
        {t.theme}
        <select
          value={theme}
          onChange={(e) => onTheme(e.target.value as Theme)}
        >
          {Object.keys(themes).map((key) => (
            <option key={key} value={key}>
              {t[key as Theme]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t.pieceSet}
        <select
          value={pieces}
          onChange={(e) => onPieces(e.target.value as PieceSet)}
        >
          <option value="classic">{t.classic}</option>
          <option value="letters">{t.letters}</option>
        </select>
      </label>
      <button className="text-button" aria-pressed={muted} onClick={onMute}>
        {muted ? t.unmute : t.mute}
      </button>
    </section>
  );
}
