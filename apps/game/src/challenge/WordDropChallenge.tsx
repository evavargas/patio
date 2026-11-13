import type { WordDropConfigV1 } from '@patio/contracts';
import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { t } from '../i18n/texts';
import { dndAccessibility } from './dnd-a11y';
import type { MechanicProps } from './mechanic-props';
import { isWordDropFilled, isWordDropSolved, splitTemplate } from './rules';

function Word({ index, label }: { index: number; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `word-${index}` });
  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="word"
      data-dragging={isDragging}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
    >
      {label}
    </li>
  );
}

type BlankProps = { id: string; n: number; words: readonly string[]; value: number | undefined; used: ReadonlySet<number>; isDone: boolean; onPick: (index: number | undefined) => void };

function Blank({ id, n, words, value, used, isDone, onPick }: BlankProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `blank-${id}` });
  return (
    <span ref={setNodeRef} className="blank" data-over={isOver}>
      <select
        aria-label={t('blankLabel', { n })}
        disabled={isDone}
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onPick(e.target.value === '' ? undefined : Number(e.target.value))}
      >
        <option value="">{t('blankPick')}</option>
        {words.map((w, i) => (i === value || !used.has(i) ? <option key={i} value={i}>{w}</option> : null))}
      </select>
    </span>
  );
}

export function WordDropChallenge({ config, isDone, onFeedback, onAchieved }: MechanicProps<WordDropConfigV1>) {
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const used = new Set(Object.values(placed));

  const place = (blankId: string, index: number | undefined) => {
    const next = Object.fromEntries(Object.entries(placed).filter(([id]) => id !== blankId || index !== undefined));
    if (index !== undefined) next[blankId] = index;
    setPlaced(next);
    if (!isWordDropFilled(next, config)) return onFeedback(null);
    if (isWordDropSolved(next, config)) {
      onFeedback(null);
      onAchieved();
    } else onFeedback('tryOtherStrategy');
  };
  const onDragEnd = (e: DragEndEvent) => {
    const over = String(e.over?.id ?? '');
    if (over.startsWith('blank-')) place(over.slice(6), Number(String(e.active.id).slice(5)));
  };
  const labelOf = (id: unknown) => {
    const s = String(id);
    if (s.startsWith('word-')) return config.words[Number(s.slice(5))] ?? '';
    const n = config.blanks.findIndex((b) => `blank-${b.id}` === s);
    return n >= 0 ? t('blankLabel', { n: n + 1 }) : '';
  };

  let blankNumber = 0;
  return (
    <DndContext sensors={sensors} onDragEnd={isDone ? undefined : onDragEnd} accessibility={dndAccessibility(labelOf)}>
      <p className="expression">
        {splitTemplate(config.template).map((part, i) => {
          if (part.kind === 'text') return <span key={i}>{part.value}</span>;
          blankNumber++;
          return (
            <Blank
              key={i}
              id={part.id}
              n={blankNumber}
              words={config.words}
              value={placed[part.id]}
              used={used}
              isDone={isDone}
              onPick={(index) => place(part.id, index)}
            />
          );
        })}
      </p>
      <h2>{t('wordBank')}</h2>
      <p>{t('wordBankHelp')}</p>
      <ul className="words">
        {config.words.map((w, i) => (used.has(i) || isDone ? null : <Word key={i} index={i} label={w} />))}
      </ul>
    </DndContext>
  );
}
