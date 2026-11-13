import { useState } from 'react';
import { recover } from '../game-actions';
import { useGameStore } from '../game-store';
import { t, type TextKey } from '../i18n/texts';
import { errorText } from '../lib/errors';
import { RECOVERY_CODE_PATTERN, normalizeCode } from '../lib/nickname';
import { ScreenShell } from './ScreenShell';

export function RecoverScreen() {
  const isForced = useGameStore((s) => s.isRecoverForced);
  const [code, setCode] = useState('');
  const [error, setError] = useState<TextKey | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!RECOVERY_CODE_PATTERN.test(code)) return setError('recoverFormat');
    setError(null);
    setIsBusy(true);
    try {
      await recover(code);
    } catch (err) {
      setError(errorText(err));
      setIsBusy(false);
    }
  };

  return (
    <ScreenShell title={t('recoverTitle')} hasLanguage>
      <p>{isForced ? t('recoverExpired') : t('recoverIntro')}</p>
      <form onSubmit={(e) => void submit(e)} noValidate>
        <div className="field">
          <label htmlFor="recovery-code">{t('recoverLabel')}</label>
          <input
            id="recovery-code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={12}
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
          />
        </div>
        <p role="alert">{error && t(error)}</p>
        <div className="actions">
          <button type="submit" disabled={isBusy}>
            {isBusy ? t('working') : t('recoverButton')}
          </button>
          {!isForced && (
            <button type="button" className="secondary" onClick={() => useGameStore.setState({ screen: 'welcome' })}>
              {t('back')}
            </button>
          )}
        </div>
      </form>
    </ScreenShell>
  );
}
