import { themes, type Theme, type PieceSet } from './BoardSettings';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Chess, Square } from 'chess.js';
import type { Copy } from '../i18n';
export function GameBoard({
  game,
  selected,
  hint,
  flipped,
  disabled,
  onSquare,
  onDrop,
  t,
  theme,
  pieces,
  premove,
  movableColor,
}: {
  movableColor: 'w' | 'b';
  theme: Theme;
  pieces: PieceSet;
  premove: { from: Square; to: Square } | null;
  game: Chess;
  selected: Square | null;
  hint: string | null;
  flipped: boolean;
  disabled: boolean;
  onSquare: (s: Square) => void;
  onDrop: (a: Square, b: Square) => boolean;
  t: Copy;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const styles: Record<string, CSSProperties> = {};
  const last = game.history({ verbose: true }).at(-1);
  if (last) {
    styles[last.from] = { backgroundColor: '#d5c47688' };
    styles[last.to] = { backgroundColor: '#d5c476aa' };
  }
  if (hint) {
    styles[hint.slice(0, 2)] = { backgroundColor: '#72bce4aa' };
    styles[hint.slice(2, 4)] = { backgroundColor: '#72bce4aa' };
  }
  if (selected) {
    styles[selected] = { backgroundColor: '#e9c46acc' };
    for (const move of game.moves({ square: selected, verbose: true }))
      styles[move.to] = {
        background: move.captured
          ? 'radial-gradient(transparent 60%, #192f2977 62%)'
          : 'radial-gradient(#192f2955 23%, transparent 25%)',
      };
  }
  if (premove) {
    styles[premove.from] = { backgroundColor: '#cba6e7aa' };
    styles[premove.to] = { backgroundColor: '#cba6e7aa' };
  }
  if (game.isCheck()) {
    const king = game
      .board()
      .flat()
      .find((p) => p?.type === 'k' && p.color === game.turn());
    if (king)
      styles[king.square] = {
        background: 'radial-gradient(#c96854 20%, transparent 80%)',
      };
  }
  return (
    <>
      <div className="board-frame" ref={container} dir="ltr">
        <Chessboard
          id="sangat-board"
          position={game.fen()}
          boardWidth={width}
          boardOrientation={flipped ? 'black' : 'white'}
          arePiecesDraggable={!disabled}
          onSquareClick={(s) => onSquare(s)}
          onPieceDrop={onDrop}
          customSquareStyles={styles}
          isDraggablePiece={({ piece }) =>
            !disabled && piece[0] === movableColor
          }
          customPieces={
            pieces === 'letters'
              ? Object.fromEntries(
                  ['w', 'b'].flatMap((color) =>
                    ['K', 'Q', 'R', 'B', 'N', 'P'].map((letter) => [
                      color + letter,
                      ({ squareWidth }: { squareWidth: number }) => (
                        <svg
                          viewBox="0 0 100 100"
                          width={squareWidth}
                          height={squareWidth}
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="35"
                            fill={color === 'w' ? '#faf5e5' : '#243b31'}
                            stroke={color === 'w' ? '#243b31' : '#faf5e5'}
                            strokeWidth="3"
                          />
                          <text
                            x="50"
                            y="64"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                            fontSize="40"
                            fontWeight="bold"
                            fill={color === 'w' ? '#243b31' : '#faf5e5'}
                          >
                            {letter}
                          </text>
                        </svg>
                      ),
                    ]),
                  ),
                )
              : undefined
          }
          customDarkSquareStyle={{ backgroundColor: themes[theme][0] }}
          customLightSquareStyle={{ backgroundColor: themes[theme][1] }}
          customBoardStyle={{ borderRadius: '3px' }}
          animationDuration={180}
          showPromotionDialog={false}
          autoPromoteToQueen={true}
        />
      </div>
      <p className="board-help">✧ {t.boardHelp}</p>
      <details className="keyboard-controls">
        <summary>{t.accessibleBoard}</summary>
        <div className="keyboard-grid" dir="ltr">
          {Array.from({ length: 64 }, (_, i) => {
            const rank = flipped
              ? Math.floor(i / 8) + 1
              : 8 - Math.floor(i / 8);
            const file = String.fromCharCode(
              (flipped ? 104 : 97) + (flipped ? -i % 8 : i % 8),
            );
            const square = `${file}${rank}` as Square;
            const piece = game.get(square);
            return (
              <button
                key={square}
                disabled={disabled}
                onClick={() => onSquare(square)}
                aria-pressed={selected === square}
                aria-label={`${square} ${piece ? `${piece.color === 'w' ? t.white : t.black} ${piece.type}` : ''}`}
              >
                {square}
                {piece?.type || ''}
              </button>
            );
          })}
        </div>
      </details>
    </>
  );
}
