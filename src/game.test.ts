import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { applyUci, restoreGame, undoTurn } from './game';
afterEach(() => vi.unstubAllGlobals());
describe('game rules and actions', () => {
  it('accepts a legal engine move and rejects an illegal move', () => {
    const game = new Chess();
    applyUci(game, 'e2e4');
    expect(game.get('e4')?.type).toBe('p');
    expect(() => applyUci(game, 'e7e4')).toThrow();
  });
  it('undoes a computer reply and the preceding human move', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    undoTurn(game, 'computer');
    expect(game.history()).toEqual([]);
  });
  it('undoes only the human move while computer is thinking', () => {
    const game = new Chess();
    game.move('e4');
    undoTurn(game, 'computer');
    expect(game.history()).toEqual([]);
  });
  it('undoes a single ply in local play', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    undoTurn(game, 'local');
    expect(game.history()).toEqual(['e4']);
  });
  it('supports underpromotion, castling and en passant through rules', () => {
    const promotion = new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');
    applyUci(promotion, 'a7a8n');
    expect(promotion.get('a8')?.type).toBe('n');
    const castle = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    applyUci(castle, 'e1g1');
    expect(castle.get('f1')?.type).toBe('r');
    const passant = new Chess();
    ['e4', 'a6', 'e5', 'd5', 'exd6'].forEach((m) => passant.move(m));
    expect(passant.get('d5')).toBeUndefined();
  });
  it('recognizes checkmate and threefold repetition', () => {
    const game = new Chess();
    ['f3', 'e5', 'g4', 'Qh4#'].forEach((m) => game.move(m));
    expect(game.isCheckmate()).toBe(true);
    const draw = new Chess();
    ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8'].forEach((m) =>
      draw.move(m),
    );
    expect(draw.isThreefoldRepetition()).toBe(true);
  });
  it('restores move history and recovers from corrupted or blocked storage', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    vi.stubGlobal('localStorage', { getItem: () => game.pgn() });
    expect(restoreGame().history()).toEqual(['e4', 'e5']);
    vi.stubGlobal('localStorage', { getItem: () => '1. gibberish' });
    expect(restoreGame().history()).toEqual([]);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(restoreGame().history()).toEqual([]);
  });
});
