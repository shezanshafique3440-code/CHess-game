import { useCallback, useEffect, useRef, useState } from 'react';
import { ChessEngine, type Level } from '../engine';
export function useEngine() {
  const engine = useRef<ChessEngine>();
  const generation = useRef(0);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'thinking' | 'hint' | 'error'
  >('loading');
  const reset = useCallback(() => {
    const id = ++generation.current;
    engine.current?.destroy();
    const next = new ChessEngine();
    engine.current = next;
    setStatus('loading');
    next.ready
      .then(() => {
        if (id === generation.current) setStatus('ready');
      })
      .catch(() => {
        if (id === generation.current) setStatus('error');
      });
  }, []);
  useEffect(() => {
    reset();
    return () => {
      generation.current++;
      engine.current?.destroy();
    };
  }, [reset]);
  const search = useCallback(
    async (fen: string, level: Level, hint = false) => {
      const id = generation.current;
      setStatus(hint ? 'hint' : 'thinking');
      try {
        const result = await engine.current!.search(fen, level, hint);
        if (id !== generation.current) return null;
        setStatus('ready');
        return result;
      } catch {
        if (id === generation.current) setStatus('error');
        return null;
      }
    },
    [],
  );
  return { status, search, reset };
}
