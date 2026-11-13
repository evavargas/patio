import { useEffect, useRef } from 'react';
import { inputState } from '../input/input-state';
import { t } from '../i18n/texts';
import { useGameStore } from '../game-store';
import { Joystick } from './Joystick';

export function Hud() {
  const day = useGameStore((s) => s.day);
  const completed = useGameStore((s) => s.completed);
  const nav = useRef<HTMLElement>(null);

  // Al volver de un desafio el foco regresa al juguete que lo abrio (sigue enfocable aunque ya este logrado).
  useEffect(() => {
    const index = useGameStore.getState().activeIndex;
    if (index === null) return;
    const button = nav.current?.querySelector<HTMLButtonElement>(`[data-toy="${index}"]`);
    button?.focus();
  }, []);

  const items = day?.items ?? [];
  return (
    <main className="hud">
      <h1 className="sr-only">{t('appTitle')}</h1>
      <div className="hud-top">
        <p className="hint">{t('moveHint')}</p>
        {items.length > 0 && (
          <nav ref={nav} aria-label={t('toysNav')} className="toys">
            <ul>
              {items.map((item, i) => {
                const isDone = completed.includes(item.challengeId);
                return (
                  <li key={item.challengeId}>
                    <button
                      type="button"
                      data-toy={i}
                      className={isDone ? 'secondary' : undefined}
                      aria-disabled={isDone}
                      onClick={() => useGameStore.getState().openToy(i)}
                    >
                      {t(isDone ? 'toyDone' : 'toyOpen', { n: i + 1 })}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
      <div className="hud-bottom">
        <Joystick />
        <button type="button" className="jump" onClick={() => (inputState.jumpRequested = true)}>
          {t('jump')}
        </button>
      </div>
    </main>
  );
}
