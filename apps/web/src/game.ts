import { Chess } from 'chess.js';
export type Mode = 'computer' | 'local';
export function restoreGame(): Chess {
  try {
    const pgn = localStorage.getItem('sangat-pgn');
    if (pgn) {
      const game = new Chess();
      game.loadPgn(pgn);
      return game;
    }
  } catch {
    /* Private storage or invalid saved game. */
  }
  return new Chess();
}
export function undoTurn(game: Chess, mode: Mode) {
  game.undo();
  if (mode === 'computer' && game.turn() === 'b' && game.history().length)
    game.undo();
}
export function applyUci(game: Chess, uci: string) {
  return game.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4] || 'q',
  });
}
export function saveSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage is optional. */
  }
}
export function getSetting(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
