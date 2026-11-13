import { useEffect } from 'react';
import { ChallengeScreen } from './challenge/ChallengeScreen';
import { boot, enterDay, leaveToYard, refreshDay } from './game-actions';
import { useGameStore } from './game-store';
import { t } from './i18n/texts';
import { attachKeyboard } from './input/input-state';
import { loadPerfFixture } from './perf/perf-fixture';
import { isPerfMode } from './perf/perf-recorder';
import { PerfPanel } from './perf/PerfPanel';
import { Scene } from './scene/Scene';
import { Hud } from './ui/Hud';
import { MessageScreen } from './ui/MessageScreen';
import { RecoverScreen } from './ui/RecoverScreen';
import { RecoveryCodeScreen } from './ui/RecoveryCodeScreen';
import { RegisterScreen } from './ui/RegisterScreen';
import { WelcomeScreen } from './ui/WelcomeScreen';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const hasResult = useGameStore((s) => s.perfResult !== null);
  const score = useGameStore((s) => s.score);
  useGameStore((s) => s.locale); // re-renderiza los textos al cambiar de idioma
  useEffect(attachKeyboard, []);
  useEffect(() => {
    if (isPerfMode) return loadPerfFixture();
    void boot();
    // Al volver de segundo plano se pide el dia de nuevo (doc 05).
    const onVisible = () => document.visibilityState === 'visible' && void refreshDay();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return (
    <>
      <div className="scene">
        <Scene />
      </div>
      {screen === 'boot' && !isPerfMode && (
        <p className="boot" role="status">
          {t('loading')}
        </p>
      )}
      {screen === 'retry' && (
        <MessageScreen key={screen} title={t('retryTitle')} body={t('retryBody')} action={t('retry')} onAction={() => void enterDay()} />
      )}
      {screen === 'welcome' && <WelcomeScreen key={screen} />}
      {screen === 'register' && <RegisterScreen key={screen} />}
      {screen === 'recoveryCode' && <RecoveryCodeScreen key={screen} />}
      {screen === 'recover' && <RecoverScreen key={screen} />}
      {screen === 'noSet' && (
        <MessageScreen key={screen} title={t('noSetTitle')} body={t('noSetBody')} action={t('stroll')} onAction={leaveToYard} />
      )}
      {screen === 'closing' && (
        <MessageScreen
          key={screen}
          title={t('closingTitle')}
          body={`${t('closingBody')} ${t('closingScore', { score })}`}
          action={t('stroll')}
          onAction={leaveToYard}
        />
      )}
      {screen === 'yard' && !hasResult && <Hud />}
      {screen === 'challenge' && <ChallengeScreen />}
      {isPerfMode && <PerfPanel />}
    </>
  );
}
