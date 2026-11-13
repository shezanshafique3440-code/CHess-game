import { useEffect, useRef } from 'react';
import type { Copy } from '../i18n';
export function MoveHistory({
  moves,
  t,
  review,
  onNavigate,
  startBlack = false,
  startNumber = 1,
}: {
  moves: string[];
  t: Copy;
  startBlack?: boolean;
  startNumber?: number;
  review: number | null;
  onNavigate: (ply: number | null) => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [moves.length]);
  return (
    <section className="history card">
      <header>
        <h2>{t.history}</h2>
        <span className="count">
          {moves.length} {t.moves}
        </span>
      </header>
      {moves.length > 0 && (
        <div className="history-navigation">
          <button onClick={() => onNavigate(0)}>{t.initialPosition}</button>
          <button disabled={review === null} onClick={() => onNavigate(null)}>
            {t.livePosition}
          </button>
        </div>
      )}
      {moves.length ? (
        <div className="move-list" dir="ltr">
          {Array.from(
            { length: Math.ceil((moves.length + (startBlack ? 1 : 0)) / 2) },
            (_, i) => (
              <div className="move-row" key={i}>
                <span>{i + startNumber}.</span>
                <b>
                  {i === 0 && startBlack ? (
                    '—'
                  ) : (
                    <button
                      aria-pressed={review === i * 2 + 1 - (startBlack ? 1 : 0)}
                      onClick={() =>
                        onNavigate(i * 2 + 1 - (startBlack ? 1 : 0))
                      }
                    >
                      {moves[i * 2 - (startBlack ? 1 : 0)]}
                    </button>
                  )}
                </b>
                <b>
                  {moves[i * 2 + 1 - (startBlack ? 1 : 0)] ? (
                    <button
                      aria-pressed={review === i * 2 + 2 - (startBlack ? 1 : 0)}
                      onClick={() =>
                        onNavigate(i * 2 + 2 - (startBlack ? 1 : 0))
                      }
                    >
                      {moves[i * 2 + 1 - (startBlack ? 1 : 0)]}
                    </button>
                  ) : (
                    '—'
                  )}
                </b>
              </div>
            ),
          )}
          <div ref={end} />
        </div>
      ) : (
        <div className="empty-history">
          <span className="empty-piece">♙</span>
          <strong>{t.emptyTitle}</strong>
          <p>{t.empty}</p>
          <div className="empty-line" />
        </div>
      )}
    </section>
  );
}
