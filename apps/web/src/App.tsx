import { useClock } from './hooks/useClock';
import { useSound } from './hooks/useSound';
import {
  rulesResult,
  timeoutResult,
  positionAt,
  exportPgn,
  resultFromPgn,
  type GameResult,
} from './results';
import { ClockPanel } from './components/ClockPanel';
import {
  BoardSettings,
  themes,
  type Theme,
  type PieceSet,
} from './components/BoardSettings';
import { GameOverModal, resultText } from './components/GameOverModal';
import { PgnTools } from './components/PgnTools';
import { ArrowIcon } from './components/ArrowIcon';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { GameBoard } from './components/GameBoard';
import { MoveHistory } from './components/MoveHistory';
import { Tutorial } from './components/Tutorial';
import { Dialog } from './components/Dialog';
import { useEngine } from './hooks/useEngine';
import {
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
  const timer = useClock(game.pgn(), game.turn());
  const sound = useSound();
  const [theme, setTheme] = useState<Theme>(() => {
    const value = getSetting('sangat-theme', 'green');
    return value in themes ? (value as Theme) : 'green';
  });
  const [pieces, setPieces] = useState<PieceSet>(
    getSetting('sangat-pieces', 'classic') === 'letters'
      ? 'letters'
      : 'classic',
  );
  const [review, setReview] = useState<number | null>(null);
  const [premove, setPremove] = useState<{
    from: Square;
    to: Square;
    promotion?: string;
  } | null>(null);
  const [manualResult, setManualResult] = useState<GameResult | null>(() => {
    try {
      const saved = JSON.parse(getSetting('sangat-result', 'null'));
      if (
        saved?.pgn === game.pgn() &&
        ['resign', 'agreement', 'importedResult'].includes(
          saved.result?.reason,
        ) &&
        [null, 'w', 'b'].includes(saved.result.winner)
      )
        return saved.result;
    } catch {
      /* Optional metadata. */
    }
    return resultFromPgn(game);
  });
  const result =
    rulesResult(game) ||
    (timer.clock.flagged ? timeoutResult(timer.clock.flagged) : manualResult);
  const resultKey = result ? `${result.reason}:${result.winner}` : '';
  const [showResult, setShowResult] = useState(false);
  const [confirmation, setConfirmation] = useState<'resign' | 'draw' | null>(
    null,
  );
  const displayGame = useMemo(
    () => (review === null ? game : positionAt(game, review)),
    [fen, review],
  );
  useEffect(() => {
    if (result) {
      timer.stop();
      reset();
      revision.current++;
      setShowResult(true);
      setPromotion(null);
      setPremove(null);
      setConfirmation(null);
      setNewMode(null);
      sound.play('end');
    } else setShowResult(false);
    saveSetting(
      'sangat-result',
      JSON.stringify({ pgn: game.pgn(), result: manualResult }),
    );
  }, [resultKey, fen]);

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
      !!result ||
      status !== 'ready'
    )
      return;
    const version = revision.current;
    void search(fen, level).then((move) => {
      if (move && version === revision.current) {
        try {
          commitMove(
            move.slice(0, 2) as Square,
            move.slice(2, 4) as Square,
            move[4] || 'q',
          );
        } catch {
          reset();
        }
      }
    });
  }, [fen, mode, level, status, resultKey]); // Game is one mutable chess.js instance; fen drives renders.

  const locked =
    !!result || review !== null || (mode === 'computer' && game.turn() === 'b');
  const boardDisabled = !!result || review !== null;
  function commitMove(from: Square, to: Square, promote = 'q'): boolean {
    if (
      result ||
      !game
        .moves({ square: from, verbose: true })
        .some((m) => m.to === to && (!m.promotion || m.promotion === promote))
    )
      return false;
    if (!timer.complete(game.turn())) return false;
    const played = game.move({ from, to, promotion: promote });
    sound.move(played, game.isCheck());
    if (status === 'hint') reset();
    sync();
    return true;
  }
  function move(from: Square, to: Square, promote?: string): boolean {
    if (boardDisabled) return false;
    if (mode === 'computer' && game.turn() === 'b') {
      const piece = game.get(from);
      if (piece?.color !== 'w' || from === to || game.get(to)?.color === 'w')
        return false;
      if (piece.type === 'p' && to[1] === '8' && !promote) {
        setPromotion({ from, to });
        return false;
      }
      setPremove({ from, to, promotion: promote || 'q' });
      setSelected(null);
      return false;
    }
    const legal = game
      .moves({ square: from, verbose: true })
      .filter((m) => m.to === to);
    if (!legal.length) return false;
    if (legal.some((m) => m.promotion) && !promote) {
      setPromotion({ from, to });
      return false;
    }
    return commitMove(from, to, promote);
  }
  useEffect(() => {
    if (
      !premove ||
      game.turn() !== 'w' ||
      mode !== 'computer' ||
      result ||
      review !== null
    )
      return;
    setPremove(null);
    commitMove(premove.from, premove.to, premove.promotion);
  }, [fen, premove, mode, resultKey, review]);
  function onSquare(square: Square) {
    if (boardDisabled || promotion) return;
    if (selected) {
      const queuing = mode === 'computer' && game.turn() === 'b';
      if (
        move(selected, square) ||
        (queuing && game.get(square)?.color !== 'w')
      )
        return;
    }
    const piece = game.get(square);
    setSelected(
      piece?.color === (mode === 'computer' ? 'w' : game.turn()) &&
        selected !== square
        ? square
        : null,
    );
  }
  function importGame(pgn: string) {
    const next = new Chess();
    next.loadPgn(pgn);
    // Parse completely before changing any current state.
    reset();
    game.loadPgn(next.pgn());
    setMode('local');
    saveSetting('sangat-mode', 'local');
    timer.reset(timer.clock.preset, game.turn());
    setManualResult(resultFromPgn(next));
    setShowResult(!!resultFromPgn(next));
    setReview(null);
    setPremove(null);
    setPromotion(null);
    sync();
  }
  function finish(reason: 'resign' | 'agreement') {
    if (result) return;
    timer.stop();
    setManualResult({
      reason,
      winner:
        reason === 'agreement'
          ? null
          : mode === 'computer' || game.turn() === 'w'
            ? 'b'
            : 'w',
    });
    setConfirmation(null);
  }
  function start(next: Mode) {
    reset();
    game.reset();
    timer.reset(timer.clock.preset, 'w');
    setManualResult(null);
    setReview(null);
    setPremove(null);
    setShowResult(false);
    setConfirmation(null);
    setMode(next);
    saveSetting('sangat-mode', next);
    sync();
    setNewMode(null);
    setPromotion(null);
  }
  function requestNew(next: Mode) {
    if (game.history().length || timer.clock.running || result)
      setNewMode(next);
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
  const outcome = result
    ? resultText(result, t)
    : `${side} ${t.turn}${game.isCheck() ? ` · ${t.check}!` : ''}`;
  const historyStart = (
    game.history({ verbose: true })[0]?.before || game.fen()
  ).split(' ');
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
            : color === game.turn() && !result
              ? t.ready
              : 'Sangat Chess'}
        </small>
      </div>
      <span
        className={`turn-dot ${game.turn() === color && !result ? 'active' : ''}`}
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
                game={displayGame}
                selected={selected}
                hint={hint}
                flipped={flipped}
                disabled={boardDisabled || !!promotion}
                movableColor={mode === 'computer' ? 'w' : game.turn()}
                theme={theme}
                pieces={pieces}
                premove={review === null ? premove : null}
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
                  disabled={!game.history().length || review !== null}
                  onClick={() => {
                    reset();
                    const before = game.history().length;
                    undoTurn(game, mode);
                    timer.undo(before - game.history().length, game.turn());
                    setManualResult(null);
                    game.setHeader('Result', '*');
                    setPremove(null);
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
              {review !== null && (
                <p className="hint-message">
                  {t.reviewing} {review}{' '}
                  <button onClick={() => setReview(null)}>
                    {t.livePosition}
                  </button>
                </p>
              )}
              {mode === 'computer' && !result && (
                <p className="board-help">{t.premoveHelp}</p>
              )}
              {premove && (
                <p className="hint-message">
                  {t.premove}:{' '}
                  <span dir="ltr">
                    {premove.from} → {premove.to}
                  </span>{' '}
                  <button onClick={() => setPremove(null)}>
                    {t.cancelPremove}
                  </button>
                </p>
              )}
              <div className="match-actions">
                <button
                  disabled={!!result || review !== null}
                  onClick={() => setConfirmation('resign')}
                >
                  {t.resign}
                </button>
                {mode === 'local' && (
                  <button
                    disabled={!!result || review !== null}
                    onClick={() => setConfirmation('draw')}
                  >
                    {t.offerDraw}
                  </button>
                )}
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
              <ClockPanel
                t={t}
                clock={timer.clock}
                disabled={
                  !!game.history().length || timer.clock.running || !!result
                }
                ended={!!result}
                onPreset={(preset) => timer.reset(preset, game.turn())}
                onStart={timer.start}
              />
              <MoveHistory
                moves={game.history()}
                startBlack={historyStart[1] === 'b'}
                startNumber={Number(historyStart[5])}
                t={t}
                review={review}
                onNavigate={(ply) => {
                  setReview(ply);
                  setSelected(null);
                  setPremove(null);
                  setHint(null);
                }}
              />
              <PgnTools
                t={t}
                onImport={importGame}
                onExport={() => exportPgn(game, result)}
              />
              <BoardSettings
                t={t}
                theme={theme}
                pieces={pieces}
                muted={sound.muted}
                onMute={sound.toggle}
                onTheme={(value) => {
                  setTheme(value);
                  saveSetting('sangat-theme', value);
                }}
                onPieces={(value) => {
                  setPieces(value);
                  saveSetting('sangat-pieces', value);
                }}
              />
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
      {showResult && result && (
        <GameOverModal
          result={result}
          t={t}
          onClose={() => setShowResult(false)}
          onNew={() => start(mode)}
        />
      )}
      {confirmation && !result && (
        <Dialog
          title={confirmation === 'resign' ? t.resignTitle : t.drawTitle}
          onClose={() => setConfirmation(null)}
        >
          <p>{confirmation === 'resign' ? t.resignText : t.drawText}</p>
          <div className="dialog-actions">
            <button onClick={() => setConfirmation(null)}>
              {confirmation === 'resign' ? t.cancel : t.decline}
            </button>
            <button
              className="primary"
              onClick={() =>
                finish(confirmation === 'resign' ? 'resign' : 'agreement')
              }
            >
              {confirmation === 'resign' ? t.resign : t.acceptDraw}
            </button>
          </div>
        </Dialog>
      )}
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
