import { describe, expect, it } from 'vitest';
import { layoutToys } from './toy-layout';

describe('layoutToys', () => {
  it('es determinista por jugador y dia, y cambia con cualquiera de los dos', () => {
    const a = layoutToys('ABCDEFGHJKMN', '2026-11-13', 4);
    expect(layoutToys('ABCDEFGHJKMN', '2026-11-13', 4)).toEqual(a);
    expect(layoutToys('ABCDEFGHJKMN', '2026-11-14', 4)).not.toEqual(a);
    expect(layoutToys('PQRSTUVWXYZ2', '2026-11-13', 4)).not.toEqual(a);
  });
  it('separa los juguetes y los deja en puntos distintos', () => {
    const toys = layoutToys('ABCDEFGHJKMN', '2026-11-13', 5);
    expect(toys).toHaveLength(5);
    for (const [i, a] of toys.entries())
      for (const b of toys.slice(i + 1)) expect(Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2])).toBeGreaterThanOrEqual(5);
  });
});
