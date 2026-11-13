import { Chess, type Color } from 'chess.js';
export type ResultReason =
  | 'checkmate'
  | 'stalemate'
  | 'resign'
  | 'agreement'
  | 'repetition'
  | 'material'
  | 'fiftyMoves'
  | 'timeout'
  | 'importedResult';
export interface GameResult {
  reason: ResultReason;
  winner: Color | null;
}
export function rulesResult(game: Chess): GameResult | null {
  if (game.isCheckmate())
    return { reason: 'checkmate', winner: game.turn() === 'w' ? 'b' : 'w' };
  if (game.isStalemate()) return { reason: 'stalemate', winner: null };
  if (game.isThreefoldRepetition())
    return { reason: 'repetition', winner: null };
  if (game.isInsufficientMaterial())
    return { reason: 'material', winner: null };
  if (game.isDrawByFiftyMoves()) return { reason: 'fiftyMoves', winner: null };
  return null;
}
export function timeoutResult(loser: Color): GameResult {
  return { reason: 'timeout', winner: loser === 'w' ? 'b' : 'w' };
}
export function pgnResult(result: GameResult | null) {
  return result
    ? result.winner === 'w'
      ? '1-0'
      : result.winner === 'b'
        ? '0-1'
        : '1/2-1/2'
    : '*';
}
export function resultFromPgn(game: Chess): GameResult | null {
  const rules = rulesResult(game);
  if (rules) return rules;
  const result = game.getHeaders().Result;
  return ['1-0', '0-1', '1/2-1/2'].includes(result)
    ? {
        reason: 'importedResult',
        winner: result === '1-0' ? 'w' : result === '0-1' ? 'b' : null,
      }
    : null;
}
export function positionAt(game: Chess, ply: number): Chess {
  const history = game.history({ verbose: true });
  return new Chess(
    ply === 0
      ? history[0]?.before || game.fen()
      : history[ply - 1]?.after || game.fen(),
  );
}
export function exportPgn(game: Chess, result: GameResult | null) {
  const copy = new Chess();
  copy.loadPgn(game.pgn());
  copy.setHeader('Result', pgnResult(result));
  return copy.pgn();
}
