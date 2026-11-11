import { inputState } from '../input/input-state';
import { t } from '../i18n/texts';
import { useGameStore } from '../game-store';
import { Joystick } from './Joystick';

export function Hud() {
  const openChallenge = useGameStore((s) => s.openChallenge);
  return (
    <div className="hud">
      <div className="hud-top">
        <p className="hint">{t('moveHint')}</p>
        <button type="button" onClick={openChallenge}>
          {t('openChallenge')}
        </button>
      </div>
      <div className="hud-bottom">
        <Joystick />
        <button type="button" className="jump" onClick={() => (inputState.jumpRequested = true)}>
          {t('jump')}
        </button>
      </div>
    </div>
  );
}
