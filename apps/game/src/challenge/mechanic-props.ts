import type { TextKey } from '../i18n/texts';

/** Cada mecanica evalua su regla localmente y avisa "lo logre"; el feedback nunca muestra la solucion. */
export type MechanicProps<Config> = {
  config: Config;
  isDone: boolean;
  onFeedback: (key: TextKey | null) => void;
  onAchieved: () => void;
};
