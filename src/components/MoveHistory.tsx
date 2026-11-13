import { useEffect, useRef } from 'react';
import type { Copy } from '../i18n';
export function MoveHistory({ moves, t }: { moves: string[]; t: Copy }) {
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
      {moves.length ? (
        <div className="move-list" dir="ltr">
          {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => (
            <div className="move-row" key={i}>
              <span>{i + 1}.</span>
              <b>{moves[i * 2]}</b>
              <b>{moves[i * 2 + 1] || '—'}</b>
            </div>
          ))}
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
