import { useEffect, useRef, useState } from 'react';
import { monotonicMs } from '../clock';
import { achieve, closeActiveChallenge } from '../game-actions';
import { useGameStore } from '../game-store';
import { t, type TextKey } from '../i18n/texts';
import { DragDropChallenge } from './DragDropChallenge';
import { NumberInputChallenge } from './NumberInputChallenge';
import { WordDropChallenge } from './WordDropChallenge';

export function ChallengeScreen() {
  const index = useGameStore((s) => s.activeIndex);
  const item = useGameStore((s) => (s.activeIndex === null ? undefined : s.day?.items[s.activeIndex]));
  const earned = useGameStore((s) => (item ? s.earned[item.challengeId] : undefined));
  const heading = useRef<HTMLHeadingElement>(null);
  const [openedAtMs] = useState(monotonicMs);
  const [isDone, setIsDone] = useState(false);
  const [feedback, setFeedback] = useState<TextKey | null>(null);
  useEffect(() => heading.current?.focus(), []);

  if (index === null || !item) return null;
  const mechanic = item.mechanic;
  const version: number = mechanic.schemaVersion; // un servidor mas nuevo puede mandar una version que no conocemos
  const common = {
    isDone,
    onFeedback: setFeedback,
    onAchieved: () => {
      setIsDone(true);
      achieve(index, openedAtMs);
    },
  };

  return (
    <div className="screen">
      <main className="panel" aria-labelledby="challenge-title">
        <h1 id="challenge-title" tabIndex={-1} ref={heading}>
          {t('challengeTitle', { n: index + 1 })}
        </h1>
        {version !== 1 ? (
          <>
            <h2>{t('unsupportedTitle')}</h2>
            <p>{t('unsupportedBody')}</p>
          </>
        ) : (
          <>
            <p>{item.text}</p>
            {mechanic.type === 'dragDrop' && <DragDropChallenge config={mechanic.config} {...common} />}
            {mechanic.type === 'numberInput' && <NumberInputChallenge config={mechanic.config} {...common} />}
            {mechanic.type === 'wordDrop' && <WordDropChallenge config={mechanic.config} {...common} />}
          </>
        )}
        <p className="status" role="status">
          {isDone ? t('achieved') : feedback && t(feedback)}
          {isDone && earned !== undefined && ` ${t('earned', { n: earned })}`}
        </p>
        <button type="button" onClick={closeActiveChallenge}>
          {t('closeChallenge')}
        </button>
      </main>
    </div>
  );
}
