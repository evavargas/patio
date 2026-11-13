// Misma regla que el servidor (doc 09): el servidor repite la validacion, esto solo avisa mientras se escribe.
export const NICKNAME_MAX_LENGTH = 20;

const normalize = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const words = (text: string): string[] => normalize(text).split(/[^\p{L}\p{N}]+/u).filter((w) => w !== '');

export type NicknameCheck = 'ok' | 'empty' | 'tooLong' | 'notAllowed';

/** Nunca dice cual palabra fallo. */
export function checkNickname(nickname: string, bannedWords: readonly string[]): NicknameCheck {
  const clean = nickname.trim();
  if (clean === '') return 'empty';
  if ([...clean].length > NICKNAME_MAX_LENGTH || /\p{Cc}/u.test(clean)) return 'tooLong';
  const nick = words(clean);
  const hasBanned = bannedWords.some((banned) => {
    const needle = words(banned);
    return needle.length > 0 && nick.some((_, i) => needle.every((w, j) => nick[i + j] === w));
  });
  return hasBanned ? 'notAllowed' : 'ok';
}

// Alfabeto de 31 simbolos (doc 01): sin 0, O, 1, I, L.
export const GROUP_CODE_PATTERN = /^[A-HJ-KM-NP-Z2-9]{6}$/;
export const RECOVERY_CODE_PATTERN = /^[A-HJ-KM-NP-Z2-9]{8}$/;
export const normalizeCode = (text: string): string => text.replace(/[\s-]/g, '').toUpperCase();
