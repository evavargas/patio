import { describe, expect, it } from 'vitest';
import { checkNickname, normalizeCode } from './nickname';

describe('checkNickname', () => {
  it('valida limites', () => {
    expect(checkNickname('  ', [])).toBe('empty');
    expect(checkNickname('Sol', [])).toBe('ok');
    expect(checkNickname('a'.repeat(21), [])).toBe('tooLong');
    expect(checkNickname('a'.repeat(20), [])).toBe('ok');
  });
  it('compara palabra completa, sin mayusculas ni tildes', () => {
    expect(checkNickname('Ñandú Malo', ['NANDU'])).toBe('notAllowed');
    expect(checkNickname('Nandurri', ['nandu'])).toBe('ok');
  });
});

describe('normalizeCode', () => {
  it('pasa a mayusculas y saca espacios y guiones', () => expect(normalizeCode('ab cd-23')).toBe('ABCD23'));
});
