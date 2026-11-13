import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  rulesResult,
  timeoutResult,
  pgnResult,
  positionAt,
  exportPgn,
  resultFromPgn,
} from './results';
describe('game results', () => {
  it('keeps an ongoing game active', () =>
    expect(rulesResult(new Chess())).toBeNull());
  it('awards checkmate to the side that delivered it', () => {
    const game = new Chess();
    ['f3', 'e5', 'g4', 'Qh4#'].forEach((move) => game.move(move));
    expect(rulesResult(game)).toEqual({ reason: 'checkmate', winner: 'b' });
  });
  it('distinguishes stalemate from insufficient material', () => {
    expect(rulesResult(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toEqual({
      reason: 'stalemate',
      winner: null,
    });
    expect(rulesResult(new Chess('7k/8/8/8/8/8/8/K7 w - - 0 1'))).toEqual({
      reason: 'material',
      winner: null,
    });
  });
  it('detects repetition from the full move history', () => {
    const game = new Chess();
    ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8'].forEach((move) =>
      game.move(move),
    );
    expect(rulesResult(game)?.reason).toBe('repetition');
  });
  it('detects the fifty-move rule', () =>
    expect(
      rulesResult(new Chess('7k/8/8/8/8/8/R7/K7 w - - 100 80'))?.reason,
    ).toBe('fiftyMoves'));
  it.each(['w', 'b'] as const)('timeout loses for %s', (color) =>
    expect(timeoutResult(color)).toEqual({
      reason: 'timeout',
      winner: color === 'w' ? 'b' : 'w',
    }),
  );
  it('exports resignation and agreed draw without changing the live game', () => {
    const game = new Chess();
    game.move('e4');
    const original = game.pgn();
    const resigned = exportPgn(game, { reason: 'resign', winner: 'b' });
    expect(resigned).toContain('[Result "0-1"]');
    expect(resigned.trim().endsWith('0-1')).toBe(true);
    expect(game.pgn()).toBe(original);
    expect(pgnResult({ reason: 'agreement', winner: null })).toBe('1/2-1/2');
    expect(pgnResult(null)).toBe('*');
    const imported = new Chess();
    imported.loadPgn(resigned);
    expect(resultFromPgn(imported)).toEqual({
      reason: 'importedResult',
      winner: 'b',
    });
  });
  it('reviews earlier positions without truncating live history', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    expect(positionAt(game, 0).fen()).toBe(new Chess().fen());
    expect(positionAt(game, 1).get('e4')?.type).toBe('p');
    expect(positionAt(game, 1).get('e7')?.type).toBe('p');
    expect(game.history()).toEqual(['e4', 'e5']);
  });
  it('preserves custom starting FEN and black-to-move imports', () => {
    const game = new Chess('7k/8/8/8/8/8/R7/K7 b - - 0 20');
    const initial = game.fen();
    game.move('Kg8');
    expect(positionAt(game, 0).fen()).toBe(initial);
    const imported = new Chess();
    imported.loadPgn(exportPgn(game, null));
    expect(imported.fen()).toBe(game.fen());
  });
});
