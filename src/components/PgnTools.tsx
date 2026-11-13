import { useState } from 'react';
import type { Copy } from '../i18n';
import { Dialog } from './Dialog';
export function PgnTools({
  t,
  onImport,
  onExport,
}: {
  t: Copy;
  onImport: (pgn: string) => void;
  onExport: () => string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  function download() {
    const url = URL.createObjectURL(
      new Blob([onExport()], { type: 'application/x-chess-pgn' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sangat-game.pgn';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="pgn-tools">
        <button onClick={download}>{t.exportPgn} ↓</button>
        <button
          onClick={() => {
            setError('');
            setOpen(true);
          }}
        >
          {t.importPgn} ↑
        </button>
      </div>
      {open && (
        <Dialog title={t.importPgn} onClose={() => setOpen(false)}>
          <p>{t.importWarning}</p>
          <label className="pgn-input">
            {t.pgnText}
            <textarea
              dir="ltr"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
            />
          </label>
          <label className="pgn-input">
            {t.pgnFile}
            <input
              type="file"
              accept=".pgn,.txt"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1000000) {
                  setError(t.fileTooLarge);
                  return;
                }
                try {
                  setText(await file.text());
                  setError('');
                } catch {
                  setError(t.invalidPgn);
                }
              }}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <button onClick={() => setOpen(false)}>{t.cancel}</button>
            <button
              className="primary"
              disabled={!text.trim()}
              onClick={() => {
                try {
                  if (text.length > 1000000) {
                    setError(t.fileTooLarge);
                    return;
                  }
                  onImport(text);
                  setOpen(false);
                } catch {
                  setError(t.invalidPgn);
                }
              }}
            >
              {t.importPgn}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
