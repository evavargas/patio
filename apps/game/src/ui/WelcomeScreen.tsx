import { useGameStore } from '../game-store';
import { t } from '../i18n/texts';
import { ScreenShell } from './ScreenShell';

export function WelcomeScreen() {
  const go = (screen: 'register' | 'recover') => () => useGameStore.setState({ screen, isRecoverForced: false });
  return (
    <ScreenShell title={t('welcomeTitle')} hasLanguage>
      <p>{t('welcomeIntro')}</p>
      <div className="actions">
        <button type="button" onClick={go('register')}>
          {t('imNew')}
        </button>
        <button type="button" className="secondary" onClick={go('recover')}>
          {t('haveCode')}
        </button>
      </div>
    </ScreenShell>
  );
}
