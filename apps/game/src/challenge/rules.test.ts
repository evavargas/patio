import type { NumberInputConfigV1, WordDropConfigV1 } from '@patio/contracts';
import { describe, expect, it } from 'vitest';
import { isDragDropSolved, isNumberInputSolved, isWordDropSolved, splitTemplate } from './rules';

describe('splitTemplate', () => {
  it('separa texto y huecos', () => {
    expect(splitTemplate('7 + {a} = 12')).toEqual([
      { kind: 'text', value: '7 + ' },
      { kind: 'blank', id: 'a' },
      { kind: 'text', value: ' = 12' },
    ]);
  });
});

describe('dragDrop', () => {
  it('equalShare exige repartir todo en partes iguales', () => {
    expect(isDragDropSolved([2, 2], 0, { type: 'equalShare' })).toBe(true);
    expect(isDragDropSolved([3, 1], 0, { type: 'equalShare' })).toBe(false);
    expect(isDragDropSolved([2, 2], 1, { type: 'equalShare' })).toBe(false);
  });
  it('targetCounts compara en orden', () => {
    expect(isDragDropSolved([3, 5], 0, { type: 'targetCounts', counts: [3, 5] })).toBe(true);
    expect(isDragDropSolved([5, 3], 0, { type: 'targetCounts', counts: [3, 5] })).toBe(false);
  });
});

describe('numberInput', () => {
  const fields: NumberInputConfigV1['fields'] = [{ id: 'a', expected: 5 }, { id: 'b', expected: 2.5 }];
  it('acepta coma decimal y rechaza vacios', () => {
    expect(isNumberInputSolved({ a: '5', b: '2,5' }, fields)).toBe(true);
    expect(isNumberInputSolved({ a: '5', b: '' }, fields)).toBe(false);
    expect(isNumberInputSolved({ a: '4', b: '2.5' }, fields)).toBe(false);
  });
});

describe('wordDrop', () => {
  const config: WordDropConfigV1 = { template: 'El {a}', blanks: [{ id: 'a', correct: 'gato' }], words: ['mesa', 'Gato'] };
  it('compara sin importar mayusculas', () => {
    expect(isWordDropSolved({ a: 1 }, config)).toBe(true);
    expect(isWordDropSolved({ a: 0 }, config)).toBe(false);
    expect(isWordDropSolved({}, config)).toBe(false);
  });
});
