import { confirmRecoveryCode } from '../game-actions';
import { useGameStore } from '../game-store';
import { t } from '../i18n/texts';
import { ScreenShell } from './ScreenShell';

// El codigo solo vive en el store hasta que se confirma; no hay otra pantalla que lo muestre.
export function RecoveryCodeScreen() {
  const code = useGameStore((s) => s.recoveryCode) ?? '';
  return (
    <ScreenShell title={t('codeTitle')}>
      <p>{t('codeIntro')}</p>
      <p>
        <span className="sr-only">{t('codeLabel')}</span>
        <strong className="code" aria-label={code.split('').join(' ')}>
          {code.replace(/(.{4})(?=.)/g, '$1 ')}
        </strong>
      </p>
      <p>{t('codeWarn')}</p>
      <button type="button" onClick={() => void confirmRecoveryCode()}>
        {t('codeDone')}
      </button>
    </ScreenShell>
  );
}
