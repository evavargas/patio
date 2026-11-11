export const NICKNAME_MAX_LENGTH = 20;

/** Solo mayusculas y tildes (doc 09): NFD, quita marcas combinadas, minusculas. */
export const normalizeText = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const words = (text: string): string[] => normalizeText(text).split(/[^\p{L}\p{N}]+/u).filter((w) => w !== "");

const containsSequence = (haystack: string[], needle: string[]): boolean =>
  needle.length > 0 && haystack.some((_, i) => needle.every((w, j) => haystack[i + j] === w));

/**
 * Devuelve el apodo recortado si se puede usar, o null. Reglas: 1 a 20 caracteres (no bytes), sin caracteres
 * de control y sin ninguna palabra (o secuencia de palabras) de la lista, comparando palabra completa.
 * No se transforma el contenido: el apodo es texto plano.
 */
export function checkNickname(nickname: string, bannedWords: readonly string[]): string | null {
  const clean = nickname.trim();
  if (clean === "" || [...clean].length > NICKNAME_MAX_LENGTH || /\p{Cc}/u.test(clean)) return null;
  const nick = words(clean);
  return bannedWords.some((banned) => containsSequence(nick, words(banned))) ? null : clean;
}
