export type Level = 'easy' | 'medium' | 'hard';
export const levels = {
  easy: { skill: 0, depth: 2 },
  medium: { skill: 6, depth: 7 },
  hard: { skill: 16, depth: 13 },
};
// Single-threaded WASM works on static hosting without COOP/COEP headers.
export class ChessEngine {
  private worker: Worker;
  private pending?: {
    resolve: (move: string) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  };
  ready: Promise<void>;
  constructor() {
    this.worker = new Worker(
      `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`,
    );
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Engine startup timed out')),
        30000,
      );
      this.worker.onmessage = ({ data }) => {
        const line = String(data);
        if (line.includes('uciok')) this.worker.postMessage('isready');
        if (line.includes('readyok')) {
          clearTimeout(timer);
          resolve();
        }
        if (line.startsWith('bestmove ') && this.pending) {
          const pending = this.pending;
          this.pending = undefined;
          clearTimeout(pending.timer);
          pending.resolve(line.split(' ')[1]);
        }
      };
      this.worker.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Engine failed to load'));
        this.fail();
      };
      this.worker.postMessage('uci');
    });
  }
  async search(fen: string, level: Level, hint = false): Promise<string> {
    await this.ready;
    if (this.pending) throw new Error('Engine is busy');
    const options = levels[level];
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fail();
        this.worker.terminate();
      }, 30000);
      this.pending = { resolve, reject, timer };
      this.worker.postMessage(
        `setoption name Skill Level value ${hint ? 16 : options.skill}`,
      );
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${hint ? 12 : options.depth}`);
    });
  }
  private fail() {
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(new Error('Engine search failed'));
      this.pending = undefined;
    }
  }
  destroy() {
    this.fail();
    this.worker.terminate();
  }
}
