import type { DragDropRule, NumberInputConfigV1, WordDropConfigV1 } from '@patio/contracts';

/** Parte un texto con huecos `{id}` en trozos de texto y huecos. */
export type TemplatePart = { kind: 'text'; value: string } | { kind: 'blank'; id: string };

export function splitTemplate(template: string): TemplatePart[] {
  const parts: TemplatePart[] = [];
  let last = 0;
  for (const m of template.matchAll(/\{([a-z][a-zA-Z0-9]{0,15})\}/g)) {
    if (m.index > last) parts.push({ kind: 'text', value: template.slice(last, m.index) });
    parts.push({ kind: 'blank', id: m[1] ?? '' });
    last = m.index + m[0].length;
  }
  if (last < template.length) parts.push({ kind: 'text', value: template.slice(last) });
  return parts;
}

/** `counts`: cuantas piezas hay en cada contenedor, en orden. `poolLeft`: piezas sin repartir. */
export function isDragDropSolved(counts: readonly number[], poolLeft: number, rule: DragDropRule): boolean {
  if (poolLeft > 0) return false;
  if (rule.type === 'targetCounts') return counts.length === rule.counts.length && counts.every((c, i) => c === rule.counts[i]);
  return counts.every((c) => c === counts[0]);
}

const parseNumber = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text.trim().replace(',', '.')));

export const areNumbersFilled = (values: Record<string, string>, fields: NumberInputConfigV1['fields']): boolean =>
  fields.every((f) => !Number.isNaN(parseNumber(values[f.id] ?? '')));

export const isNumberInputSolved = (values: Record<string, string>, fields: NumberInputConfigV1['fields']): boolean =>
  fields.every((f) => Math.abs(parseNumber(values[f.id] ?? '') - f.expected) < 1e-9);

/** `placed`: id del hueco -> posicion de la palabra en el banco. */
export const isWordDropSolved = (placed: Record<string, number>, config: WordDropConfigV1): boolean =>
  config.blanks.every((b) => {
    const index = placed[b.id];
    const word = index === undefined ? undefined : config.words[index];
    return word !== undefined && word.normalize('NFC').toLowerCase() === b.correct.normalize('NFC').toLowerCase();
  });

export const isWordDropFilled = (placed: Record<string, number>, config: WordDropConfigV1): boolean =>
  config.blanks.every((b) => placed[b.id] !== undefined);
