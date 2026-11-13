import { useEffect, useRef, type ReactNode } from 'react';
import { changeLocale } from '../game-actions';
import { useGameStore } from '../game-store';
import { t } from '../i18n/texts';

/** Pantalla DOM sobre la escena: main + h1. Al aparecer, el foco va al titulo. */
export function ScreenShell({ title, children, hasLanguage = false }: { title: string; children: ReactNode; hasLanguage?: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const locale = useGameStore((s) => s.locale);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="screen">
      <main className="panel" aria-labelledby="screen-title">
        <h1 id="screen-title" tabIndex={-1} ref={heading}>
          {title}
        </h1>
        {children}
        {hasLanguage && (
          <p>
            <button type="button" className="secondary" lang={locale === 'en' ? 'es-UY' : 'en'} onClick={() => void changeLocale(locale === 'en' ? 'es-UY' : 'en')}>
              {t('language')}
            </button>
          </p>
        )}
      </main>
    </div>
  );
}
