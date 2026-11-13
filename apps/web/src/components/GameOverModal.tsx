import type { GameResult } from '../results';
import type { Copy } from '../i18n';
import { Dialog } from './Dialog';
export function resultText(result: GameResult, t: Copy) {
  return `${result.winner ? `${result.winner === 'w' ? t.white : t.black} ${t.winner} · ` : ''}${t[result.reason]}`;
}
export function GameOverModal({
  result,
  t,
  onClose,
  onNew,
}: {
  result: GameResult;
  t: Copy;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <Dialog title={t.gameOver} onClose={onClose}>
      <p className="result-text">{resultText(result, t)}</p>
      <div className="dialog-actions">
        <button onClick={onClose}>{t.reviewGame}</button>
        <button className="primary" onClick={onNew}>
          {t.newGame}
        </button>
      </div>
    </Dialog>
  );
}
