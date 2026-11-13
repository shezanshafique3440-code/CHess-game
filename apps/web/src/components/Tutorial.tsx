import { ArrowIcon } from './ArrowIcon';
import type { Copy } from '../i18n';
export function Tutorial({ t, onClose }: { t: Copy; onClose: () => void }) {
  const steps = [
    [t.tutorial1, t.tutorial1Text, '♞'],
    [t.tutorial2, t.tutorial2Text, '♙'],
    [t.tutorial3, t.tutorial3Text, '♔'],
    [t.tutorial4, t.tutorial4Text, '♖'],
    [t.tutorial5, t.tutorial5Text, '✧'],
  ];
  return (
    <main className="tutorial">
      <div className="eyebrow">01 — {t.learn}</div>
      <h1>{t.tutorialTitle}</h1>
      <p className="intro">{t.tutorialIntro}</p>
      <div className="lesson-grid">
        {steps.map(([title, text, icon], i) => (
          <article className="lesson" key={title}>
            <span className="lesson-icon">{icon}</span>
            <span className="eyebrow">0{i + 1}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <button className="primary" onClick={onClose}>
        {t.back} <ArrowIcon />
      </button>
    </main>
  );
}
