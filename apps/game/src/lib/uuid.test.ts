import { isDayKey } from '@patio/contracts';
import { describe, expect, it } from 'vitest';
import { uuid } from './uuid';

describe('uuid', () => {
  it('es un UUID v4 distinto cada vez', () => {
    expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuid()).not.toBe(uuid());
    expect(isDayKey('2026-11-13')).toBe(true); // el contrato carga bajo vitest
  });
});
