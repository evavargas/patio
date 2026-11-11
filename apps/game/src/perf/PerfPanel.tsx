import { useEffect, useState } from 'react';
import { t } from '../i18n/texts';
import { useGameStore } from '../game-store';
import { perfElapsedS, perfTotalS } from './perf-recorder';

export function PerfPanel() {
  const result = useGameStore((s) => s.perfResult);
  const [seconds, setSeconds] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setSeconds(perfElapsedS()), 500);
    return () => clearInterval(id);
  }, []);

  if (!result) {
    return (
      <p className="perf-banner" role="status">
        {t('perfRunning', { seconds, total: perfTotalS })}
      </p>
    );
  }

  const json = JSON.stringify(result, null, 2);
  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `patio-perf-${result.startedAt.replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setIsCopied(true);
  };

  return (
    <div className="screen">
      <main className="panel" aria-labelledby="perf-title">
        <h1 id="perf-title">{t('perfTitle')}</h1>
        <p>{t('perfDone')} {t('perfNote')}</p>
        <h2>{t('perfSummary')}</h2>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- region con scroll: debe ser enfocable con teclado (WCAG 2.1.1) */}
        <pre id="perf-json" tabIndex={0}>{json}</pre>
        <button type="button" onClick={download}>{t('perfDownload')}</button>{' '}
        <button type="button" className="secondary" onClick={copy}>{t('perfCopy')}</button>
        <p role="status">{isCopied ? t('perfCopied') : ''}</p>
      </main>
    </div>
  );
}
