import { useEffect, useState } from 'react';
import { register } from '../game-actions';
import { useGameStore } from '../game-store';
import { t, type TextKey } from '../i18n/texts';
import { getBannedWords } from '../lib/api';
import { errorText } from '../lib/errors';
import { GROUP_CODE_PATTERN, checkNickname, normalizeCode } from '../lib/nickname';
import { ScreenShell } from './ScreenShell';

const NICKNAME_MESSAGE = { ok: null, empty: 'nicknameEmpty', tooLong: 'nicknameTooLong', notAllowed: 'nicknameNotAllowed' } as const;

export function RegisterScreen() {
  const [nickname, setNickname] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [isAccepted, setIsAccepted] = useState(false);
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [error, setError] = useState<TextKey | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Sin lista descargada igual se puede seguir: el servidor repite la validacion.
  useEffect(() => {
    void getBannedWords().then((r) => setBannedWords(r.words), () => undefined);
  }, []);

  const nicknameCheck = nickname === '' ? 'ok' : checkNickname(nickname, bannedWords);
  const nicknameMessage = NICKNAME_MESSAGE[nicknameCheck];

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const check = checkNickname(nickname, bannedWords);
    if (check !== 'ok') return setError(NICKNAME_MESSAGE[check]);
    if (groupCode !== '' && !GROUP_CODE_PATTERN.test(groupCode)) return setError('groupCodeInvalid');
    if (!isAccepted) return setError('termsRequired');
    setError(null);
    setIsBusy(true);
    try {
      await register(nickname, groupCode);
    } catch (err) {
      setError(errorText(err));
      setIsBusy(false);
    }
  };

  return (
    <ScreenShell title={t('registerTitle')} hasLanguage>
      <form onSubmit={(e) => void submit(e)} noValidate>
        <div className="field">
          <label htmlFor="nickname">{t('nicknameLabel')}</label>
          <p id="nickname-hint">{t('nicknameHint')}</p>
          <input
            id="nickname"
            type="text"
            autoComplete="off"
            aria-describedby="nickname-hint nickname-message"
            aria-invalid={nicknameMessage !== null}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <p id="nickname-message" role="status">
            {nicknameMessage && t(nicknameMessage)}
          </p>
        </div>
        <div className="field">
          <label htmlFor="group-code">{t('groupCodeLabel')}</label>
          <p id="group-code-hint">{t('groupCodeHint')}</p>
          <input
            id="group-code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={6}
            aria-describedby="group-code-hint"
            value={groupCode}
            onChange={(e) => setGroupCode(normalizeCode(e.target.value))}
          />
        </div>
        <details>
          <summary>{t('termsSummary')}</summary>
          <p>{t('termsBody')}</p>
        </details>
        <p>
          <label className="check">
            <input type="checkbox" checked={isAccepted} onChange={(e) => setIsAccepted(e.target.checked)} />
            {t('termsAccept')}
          </label>
        </p>
        <p role="alert">{error && t(error)}</p>
        <div className="actions">
          <button type="submit" disabled={isBusy}>
            {isBusy ? t('working') : t('enter')}
          </button>
          <button type="button" className="secondary" onClick={() => useGameStore.setState({ screen: 'welcome' })}>
            {t('back')}
          </button>
        </div>
      </form>
    </ScreenShell>
  );
}
