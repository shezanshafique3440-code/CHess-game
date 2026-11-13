import { ArrowIcon } from './components/ArrowIcon';
import { useEffect, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { GameBoard } from './components/GameBoard';
import { MoveHistory } from './components/MoveHistory';
import { Tutorial } from './components/Tutorial';
import { Dialog } from './components/Dialog';
import { useEngine } from './hooks/useEngine';
import {
  applyUci,
  getSetting,
  restoreGame,
  saveSetting,
  undoTurn,
  type Mode,
} from './game';
import { translations, type Language } from './i18n';
import type { Level } from './engine';
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export default function App() {
  const [game] = useState(restoreGame);
  const [fen, setFen] = useState(game.fen());
  const [language, setLanguage] = useState<Language>(
    getSetting('sangat-language', 'en') === 'ur' ? 'ur' : 'en',
  );
  const [mode, setMode] = useState<Mode>(
    getSetting('sangat-mode', 'computer') === 'local' ? 'local' : 'computer',
  );
  const [level, setLevel] = useState<Level>(() => {
    const saved = getSetting('sangat-level', 'easy');
    return saved === 'medium' || saved === 'hard' ? saved : 'easy';
  });
  const [screen, setScreen] = useState('play');
  const [selected, setSelected] = useState<Square | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [promotion, setPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [newMode, setNewMode] = useState<Mode | null>(null);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const revision = useRef(0);
  const { status, search, reset } = useEngine();
  const t = translations[language];
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    saveSetting('sangat-language', language);
  }, [language]);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', handler);
    navigator.serviceWorker?.ready.then(() => setOfflineReady(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  function sync() {
    revision.current++;
    setFen(game.fen());
    setSelected(null);
    setHint(null);
    saveSetting('sangat-pgn', game.pgn());
  }
  useEffect(() => {
    if (
      mode !== 'computer' ||
      game.turn() !== 'b' ||
      game.isGameOver() ||
      status !== 'ready'
    )
      return;
    const version = revision.current;
    void search(fen, level).then((move) => {
      if (move && version === revision.current) {
        try {
          applyUci(game, move);
          sync();
        } catch {
          reset();
        }
      }
    });
  }, [fen, mode, level, status]); // Game is one mutable chess.js instance; fen drives renders.
  const locked =
    game.isGameOver() || (mode === 'computer' && game.turn() === 'b');
  function move(from: Square, to: Square, promote?: string): boolean {
    if (locked) return false;
    const legal = game
      .moves({ square: from, verbose: true })
      .filter((m) => m.to === to);
    if (!legal.length) return false;
    if (legal.some((m) => m.promotion) && !promote) {
      setPromotion({ from, to });
      return false;
    }
    try {
      game.move({ from, to, promotion: promote || 'q' });
      if (status === 'hint') reset();
      sync();
      return true;
    } catch {
      return false;
    }
  }
  function onSquare(square: Square) {
    if (locked || promotion) return;
    if (selected && move(selected, square)) return;
    if (promotion) return;
    const piece = game.get(square);
    setSelected(
      piece?.color === game.turn() && selected !== square ? square : null,
    );
  }
  function start(next: Mode) {
    reset();
    game.reset();
    setMode(next);
    saveSetting('sangat-mode', next);
    sync();
    setNewMode(null);
    setPromotion(null);
  }
  function requestNew(next: Mode) {
    if (game.history().length) setNewMode(next);
    else start(next);
  }
  async function showHint() {
    const version = revision.current;
    const result = await search(fen, level, true);
    if (
      version === revision.current &&
      result &&
      /^[a-h][1-8][a-h][1-8]/.test(result)
    ) {
      setHint(result);
      setSelected(null);
    }
  }
  const side = game.turn() === 'w' ? t.white : t.black;
  const outcome = game.isCheckmate()
    ? `${game.turn() === 'w' ? t.black : t.white} ${t.mate}`
    : game.isDraw()
      ? t.draw
      : `${side} ${t.turn}${game.isCheck() ? ` · ${t.check}!` : ''}`;
  const topColor = flipped ? 'w' : 'b';
  const player = (color: string) => (
    <div className="player">
      <div className={`avatar ${color === 'w' ? 'light' : ''}`}>
        {color === 'b' && mode === 'computer' ? '✦' : color === 'w' ? '♔' : '♚'}
      </div>
      <div>
        <strong>
          {color === 'b'
            ? mode === 'computer'
              ? t.stockfish
              : t.friend
            : mode === 'computer'
              ? t.you
              : t.white}
          <span className="player-tag">
            {color === 'w' ? t.white : t.black}
          </span>
        </strong>
        <small>
          {color === 'b' && mode === 'computer'
            ? `${t[level]} · ${status === 'thinking' ? t.thinking : status === 'loading' ? t.loading : t.ready}`
            : color === game.turn() && !game.isGameOver()
              ? t.ready
              : 'Sangat Chess'}
        </small>
      </div>
      <span
        className={`turn-dot ${game.turn() === color && !game.isGameOver() ? 'active' : ''}`}
      />
    </div>
  );
  return (
    <div className="app">
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setScreen('play');
          }}
          aria-label="Sangat Chess"
        >
          <span className="brand-symbol">♞</span>
          <span>
            sangat<span className="brand-period">.</span>
            <small>CHESS CLUB</small>
          </span>
        </a>
        <nav>
          <button
            className={screen === 'play' ? 'nav-active' : ''}
            onClick={() => setScreen('play')}
          >
            {t.play}
          </button>
          <button
            className={screen === 'learn' ? 'nav-active' : ''}
            onClick={() => setScreen('learn')}
          >
            {t.learn}
            <span>
              {' '}
              <ArrowIcon />
            </span>
          </button>
        </nav>
        <button
          className="language"
          onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')}
        >
          ◎ <span>{t.language}</span>
        </button>
      </header>
      {screen === 'learn' ? (
        <Tutorial t={t} onClose={() => setScreen('play')} />
      ) : (
        <main>
          <section className="hero">
            <div>
              <div className="eyebrow">
                <span /> {t.eyebrow}
              </div>
              <h1>{t.title}</h1>
              <p className="intro">{t.intro}</p>
            </div>
            <div className="hero-mark" aria-hidden="true">
              ♞<span>EST. 2026 · EVERYONE’S WELCOME</span>
            </div>
          </section>
          <div className="game-layout">
            <section className="board-column">
              <div className="board-top">
                {player(topColor)}
                <button
                  className="icon-button"
                  aria-label={t.flip}
                  title={t.flip}
                  onClick={() => setFlipped(!flipped)}
                >
                  ⇅
                </button>
              </div>
              <GameBoard
                game={game}
                selected={selected}
                hint={hint}
                flipped={flipped}
                disabled={locked || !!promotion}
                onSquare={onSquare}
                onDrop={move}
                t={t}
              />
              <div className="board-bottom">
                {player(flipped ? 'b' : 'w')}
                <span className="status-pill" role="status">
                  {outcome}
                </span>
              </div>
              <div className="game-actions">
                <button
                  disabled={!game.history().length}
                  onClick={() => {
                    reset();
                    undoTurn(game, mode);
                    setPromotion(null);
                    sync();
                  }}
                >
                  ↶ <span>{t.undo}</span>
                </button>
                <button
                  disabled={locked || status !== 'ready'}
                  onClick={() => void showHint()}
                >
                  ✧ <span>{status === 'hint' ? t.thinking : t.hint}</span>
                </button>
                <button onClick={() => requestNew(mode)}>
                  ＋ <span>{t.newGame}</span>
                </button>
              </div>
              {hint && (
                <p className="hint-message" role="status">
                  {t.hintLabel}:{' '}
                  <b dir="ltr">
                    {hint.slice(0, 2)} → {hint.slice(2, 4)}
                  </b>
                </p>
              )}
              {status === 'error' && (
                <div className="engine-error" role="alert">
                  {t.engineError} <button onClick={reset}>{t.retry}</button>
                </div>
              )}
            </section>
            <aside>
              <section className="opponent card">
                <div className="eyebrow">{t.opponent}</div>
                <div className="mode-tabs">
                  <button
                    aria-pressed={mode === 'computer'}
                    className={mode === 'computer' ? 'chosen' : ''}
                    onClick={() =>
                      mode !== 'computer' && requestNew('computer')
                    }
                  >
                    ✦ {t.computer}
                  </button>
                  <button
                    aria-pressed={mode === 'local'}
                    className={mode === 'local' ? 'chosen' : ''}
                    onClick={() => mode !== 'local' && requestNew('local')}
                  >
                    ♙ {t.local}
                  </button>
                </div>
                {mode === 'computer' && (
                  <>
                    <label className="difficulty-label">{t.difficulty}</label>
                    <div className="difficulty-options">
                      {(['easy', 'medium', 'hard'] as Level[]).map((l, i) => (
                        <button
                          key={l}
                          aria-pressed={level === l}
                          className={level === l ? 'chosen' : ''}
                          onClick={() => {
                            setLevel(l);
                            saveSetting('sangat-level', l);
                            if (status === 'thinking' || status === 'hint')
                              reset();
                          }}
                        >
                          <span className="bars">
                            {Array.from({ length: 3 }, (_, n) => (
                              <i
                                key={n}
                                className={n <= i ? 'filled' : ''}
                                style={{ height: `${5 + n * 4}px` }}
                              />
                            ))}
                          </span>
                          {t[l]}
                        </button>
                      ))}
                    </div>
                    <p className="level-note">{t[`${level}Note`]}</p>
                  </>
                )}
              </section>
              <MoveHistory moves={game.history()} t={t} />
              <section className="wisdom">
                <span className="wisdom-icon">✧</span>
                <div className="eyebrow">{t.tipTitle}</div>
                <p>{t.tip}</p>
                <button onClick={() => setScreen('learn')}>
                  {t.learn}{' '}
                  <span>
                    <ArrowIcon />
                  </span>
                </button>
              </section>
              <p className="save-note">◌ {t.saveNote}</p>
            </aside>
          </div>
        </main>
      )}
      <footer>
        <span>{t.footer}</span>
        <span className="offline-dot">
          ● <span>{offlineReady ? t.offline : t.online}</span>
        </span>
        {install && (
          <button
            onClick={async () => {
              await install.prompt();
              await install.userChoice;
              setInstall(null);
            }}
          >
            {t.install} ↓
          </button>
        )}
        <span className="footer-signature">PLAY. LEARN. REPEAT.</span>
      </footer>
      {promotion && (
        <Dialog title={t.promotion} onClose={() => setPromotion(null)}>
          <div className="promotion-options">
            {(['q', 'r', 'b', 'n'] as const).map((piece, i) => (
              <button
                key={piece}
                onClick={() => {
                  move(promotion.from, promotion.to, piece);
                  setPromotion(null);
                }}
              >
                <span>{['♕', '♖', '♗', '♘'][i]}</span>
                {[t.queen, t.rook, t.bishop, t.knight][i]}
              </button>
            ))}
          </div>
          <button className="text-button" onClick={() => setPromotion(null)}>
            {t.cancel}
          </button>
        </Dialog>
      )}
      {newMode && (
        <Dialog title={t.confirmTitle} onClose={() => setNewMode(null)}>
          <p>{t.confirmText}</p>
          <div className="dialog-actions">
            <button onClick={() => setNewMode(null)}>{t.cancel}</button>
            <button className="primary" onClick={() => start(newMode)}>
              {t.confirm}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
