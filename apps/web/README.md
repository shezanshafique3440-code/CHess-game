# Sangat Chess

The existing local chess application now lives in `apps/web`. Local games and the offline PWA do not require the authentication server. For monorepo and auth setup, see the [root README](../../README.md).

## Run

Use Node.js 22.12+ (tested with Node 24) and npm.

```sh
npm ci
npm run dev:web
```

Vite prints the development address. `npm ci` automatically copies the pinned Stockfish worker and WASM from the npm package into `apps/web/public/engine/`. These generated engine files are ignored by Git. If install scripts are disabled, run `node apps/web/scripts/copy-engine.mjs` before starting or building.

## Play

- **Computer:** you play White; choose Beginner (skill 0 / depth 2), Casual (skill 6 / depth 7), or Challenger (skill 16 / depth 13). These are relative difficulty levels, not calibrated Elo ratings. You can change difficulty during a game.
- **With a friend:** share the device and alternate turns. Flip the board whenever useful.
- Tap a piece, then a highlighted destination, or drag it. Legal captures, last moves, check, and hints are highlighted. Promotion opens a choice of queen, rook, bishop, or knight.
- **Undo** takes back a full turn against the computer, or one move in local play. It cancels any pending computer search. **Hint** asks Stockfish for a move for the current side; it does not play it. **New game** asks before clearing a game with moves. Changing opponent starts a new game with the same confirmation.
- Open **Keyboard board controls** below the board for a focusable button for every square. Select a source and destination using Tab and Enter/Space.
- Toggle **اردو / English** for translated controls and tutorial content, with right-to-left Urdu layout. Chess move notation remains standard SAN.
- **Learn the basics** covers pieces, moves, checkmate, castling, en passant, promotion, and draws.
- Game PGN, language, opponent mode, and difficulty are saved in local storage. Clearing browser data clears them. Saving is optional; blocked browser storage does not prevent play.

Board legality and automatic board results are handled by chess.js, including castling, en passant, underpromotion, checkmate, stalemate, repetition, insufficient material, and the fifty-move rule. The app automatically ends the game when chess.js reports a draw.

## Clocks, results, and game tools

- **Chess clock:** choose **1+0, 3+2, 5+0, 10+0, or 15+10** before starting (default 5+0). The first number is minutes per player and the second is the increment in seconds. Start explicitly with **Start clock**, or make your first move to start automatically; the first move also receives its increment. A running game's preset is locked until New game.
- Time is calculated from timestamps, so background tabs, history review, tutorial visits, and reloading do not pause it. Running clocks continue across closing/reopening the page when local storage is available. A move at or after zero is rejected and the player whose time expires loses. This app uses a straightforward timeout loss, without adjudicating whether the opponent could theoretically mate.
- **Undo** restores clock snapshots as well as moves and removes the undone increments. Against Stockfish it restores a full turn. Imported or pre-upgrade games have no earlier timing snapshots; undoing into that history resets both clocks to the selected preset, stopped.
- The **Game over** modal explains checkmate, stalemate, threefold repetition, insufficient material, fifty-move draw, timeout, resignation, or agreement. Close it to review the board or start a new game. **Resign** requires confirmation. In local mode **Offer draw** asks the other player to accept or decline on the shared device. Computer draw negotiation is not implemented; draw by agreement is a local two-player feature.
- **Sounds:** distinct generated tones for moves, captures, checks, castling, and game end. Check takes precedence over the move/capture/castling tone, with an additional ending sequence when the game finishes. Audio activates after a tap or keypress, as required by browsers. Mute/enable it under **Board & sound**. No audio downloads are required.
- **Appearance:** Green, Brown, and Blue boards; Classic chess pieces or high-contrast Letter pieces (K/Q/R/B/N/P). Theme, piece set, and mute preferences persist on this device.
- **Premoves:** while Stockfish thinks, tap or drag your own White piece to a destination. One queued move is highlighted in purple. It executes only if legal after the reply; otherwise it is discarded. Choose a promotion piece when needed. Cancel with **Cancel premove**. Undo, new game, import, game end, and entering history review clear the queue. Local play uses normal alternating moves.
- **Review:** click a move in the history, or **Starting position**, to view that position without modifying the live game. Board input, hints, undo, and resignation are disabled in review. The live clocks and any pending computer reply continue. Choose **Return to live game** to resume input.
- **PGN:** export a downloadable `.pgn`, including the game result. Import by pasting text or selecting a file (under 1 MB). Import replaces the game, switches to local play, and resets clocks; the dialog explains this before you confirm. Invalid imports leave your game untouched. Starting FEN, move numbers, Black-to-move games, and completed results are supported. PGN does not contain this app's per-move clock snapshots, sound settings, or queued premoves.

All new controls, confirmations, result reasons, and errors are available in English and Urdu. Game, result, and timing metadata are stored locally alongside the existing preferences.

### Windows PowerShell

If PowerShell blocks `npm.ps1`, use `npm.cmd` without changing your execution policy:

```powershell
git pull
npm.cmd ci
npm.cmd run dev:web
```

Open the address Vite prints (normally http://localhost:5173). For PWA/offline testing, stop dev with Ctrl+C, then run `npm.cmd run build` followed by `npm.cmd run preview` and open the printed preview address.

## Verify

```sh
npm run test:web
npm run build
npm run preview
```

Unit tests cover clock presets, elapsed time, increments, timeout boundaries, game-over reasons, PGN results, position review, rules integration, undo semantics, and saved-game recovery. The production build runs the TypeScript checker and generates the PWA service worker.

Browser checks run against a production preview and exercise real Stockfish replies at all three levels, hint, tap moves, undo, persistence, language/tutorial navigation, mobile overflow, offline reload with WASM, clock/timeout behavior, result modals, premoves, review navigation, PGN import/export, and appearance settings:

```sh
# Install Playwright Chromium if a system Chromium is unavailable:
npx playwright install chromium
npm run test:e2e
```

The test config uses `/usr/bin/chromium` when present, otherwise Playwright’s installed Chromium. Set `CHROMIUM_PATH` to override the executable. `npm run format:check` checks formatting.

## Deploy

```sh
npm ci
npm run build
```

Upload **the entire `apps/web/dist/` directory**, including `engine/`, font assets, icons, manifest, and service worker, to any static HTTPS host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, or a normal web server).

- Build command: `npm run build`
- Output directory: `apps/web/dist`
- Node: 22.12+ or 24
- Serve `.wasm` as `application/wasm` and `.js` as JavaScript. Do not rewrite engine or asset requests to `index.html`.
- HTTPS is required for service workers and installation; localhost works for development. No cross-origin isolation headers are needed because the engine is single-threaded.
- For a subdirectory such as GitHub Pages `/CHess-game/`, build with `BASE_PATH=/CHess-game/ npm run build`. The worker and manifest use the configured base path.
- Serve `sw.js` and `index.html` with revalidation rather than a long immutable cache. Hashed assets can be cached long term.

The production PWA precaches the app, fonts, and Stockfish JS/WASM (roughly 3 MB). Wait for **Offline ready** on the first connected visit before going offline. Computer play, local play, hints, and the tutorial then work offline. Use the install button when your browser offers it, or the browser's Install/Add to Home Screen menu (Share → Add to Home Screen in iOS Safari). The development server does not register an offline service worker; test this with the production build and preview. Automatic updates activate when a new service worker is available.

No deployment has been published automatically.

## Structure

```text
apps/web/src/components/  Board, history, clocks, PGN tools, settings, accessible dialogs
apps/web/src/hooks/       Stockfish lifecycle, clock snapshots, and generated sounds
apps/web/src/engine.ts    UCI protocol adapter and difficulty settings
apps/web/src/game.ts      Persistence and move/undo helpers
apps/web/src/clock.ts     Pure timestamp-based clock transitions
apps/web/src/results.ts   Game-over classification, review, PGN results
apps/web/src/i18n.ts      English and Urdu copy
apps/web/src/App.tsx      Game orchestration and application layout
scripts/         Repeatable engine asset setup
public/          PWA icons and third-party notices
```

Stockfish runs in its own worker and is terminated/recreated when a search must be canceled. Stale hint or computer results cannot alter a newer position. If the engine fails to load or times out, the app offers a retry and local play remains available.

## Third-party licenses

Stockfish.js is GPL-3.0. The deployed app includes `STOCKFISH-LICENSE.txt` and `THIRD-PARTY-NOTICES.txt`, with a corresponding source and build-instruction link for the exact pinned package. Preserve these notices when distributing the engine. Fonts use SIL OFL 1.1; their license texts are included under `public/licenses/`. Other dependency licenses are provided in their npm packages.
