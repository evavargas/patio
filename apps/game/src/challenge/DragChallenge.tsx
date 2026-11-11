import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { t, type TextKey } from '../i18n/texts';
import { useGameStore } from '../game-store';

type Zone = 'pool' | 'living' | 'things';
type CardDef = { id: string; label: TextKey; zone: Exclude<Zone, 'pool'> };

// Regla local; nunca se muestra la solucion ni se cuentan intentos.
const CARDS: readonly CardDef[] = [
  { id: 'cat', label: 'cardCat', zone: 'living' },
  { id: 'flower', label: 'cardFlower', zone: 'living' },
  { id: 'stone', label: 'cardStone', zone: 'things' },
  { id: 'table', label: 'cardTable', zone: 'things' },
];
const ZONE_LABEL: Record<Zone, TextKey> = { pool: 'pool', living: 'livingBox', things: 'thingsBox' };
const cardLabel = (id: unknown) => {
  const c = CARDS.find((x) => x.id === id);
  return c ? t(c.label) : '';
};
const zoneLabel = (id: unknown) => (id === 'pool' || id === 'living' || id === 'things' ? t(ZONE_LABEL[id]) : '');

function Card({ card, zone, onMove }: { card: CardDef; zone: Zone; onMove: (z: Zone) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.7 : 1 } : undefined;
  return (
    <li ref={setNodeRef} style={style} className="card">
      <span className="card-name" {...attributes} {...listeners}>
        {t(card.label)}
      </span>
      <div className="card-actions">
        {zone !== 'living' && (
          <button type="button" className="secondary" onClick={() => onMove('living')}>
            {t('moveToLiving')}
            <span className="sr-only">: {t(card.label)}</span>
          </button>
        )}
        {zone !== 'things' && (
          <button type="button" className="secondary" onClick={() => onMove('things')}>
            {t('moveToThings')}
            <span className="sr-only">: {t(card.label)}</span>
          </button>
        )}
        {zone !== 'pool' && (
          <button type="button" className="secondary" onClick={() => onMove('pool')}>
            {t('moveBack')}
            <span className="sr-only">: {t(card.label)}</span>
          </button>
        )}
      </div>
    </li>
  );
}

function Box({ zone, children }: { zone: Zone; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: zone });
  return (
    <section ref={setNodeRef} className="box" data-over={isOver} aria-labelledby={`zone-${zone}`}>
      <h3 id={`zone-${zone}`}>{t(ZONE_LABEL[zone])}</h3>
      <ul className="cards">{children}</ul>
    </section>
  );
}

export function DragChallenge() {
  const closeChallenge = useGameStore((s) => s.closeChallenge);
  const [placed, setPlaced] = useState<Record<string, Zone>>({});
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));

  const zoneOf = (id: string): Zone => placed[id] ?? 'pool';
  const move = (id: string, zone: Zone) => setPlaced((p) => ({ ...p, [id]: zone }));
  const onDragEnd = (e: DragEndEvent) => {
    const to = e.over?.id;
    if (to === 'pool' || to === 'living' || to === 'things') move(String(e.active.id), to);
  };

  const allPlaced = CARDS.every((c) => zoneOf(c.id) !== 'pool');
  const isAchieved = allPlaced && CARDS.every((c) => zoneOf(c.id) === c.zone);
  const message = isAchieved ? t('achieved') : allPlaced ? t('tryOtherStrategy') : '';

  return (
    <div className="screen">
      <main className="panel" aria-labelledby="challenge-title">
        <h1 id="challenge-title" tabIndex={-1} ref={(el) => el?.focus()}>
          {t('challengeTitle')}
        </h1>
        <p>{t('challengeIntro')}</p>
        <DndContext
          sensors={sensors}
          onDragEnd={onDragEnd}
          accessibility={{
            screenReaderInstructions: { draggable: t('dragInstructions') },
            announcements: {
              onDragStart: ({ active }) => t('dragStart', { item: cardLabel(active.id) }),
              onDragOver: ({ active, over }) => (over ? t('dragOver', { item: cardLabel(active.id), target: zoneLabel(over.id) }) : undefined),
              onDragEnd: ({ active }) => t('dragEnd', { item: cardLabel(active.id) }),
              onDragCancel: ({ active }) => t('dragCancel', { item: cardLabel(active.id) }),
            },
          }}
        >
          <Box zone="pool">
            {CARDS.filter((c) => zoneOf(c.id) === 'pool').map((c) => (
              <Card key={c.id} card={c} zone="pool" onMove={(z) => move(c.id, z)} />
            ))}
          </Box>
          <div className="boxes">
            {(['living', 'things'] as const).map((z) => (
              <Box key={z} zone={z}>
                {CARDS.filter((c) => zoneOf(c.id) === z).map((c) => (
                  <Card key={c.id} card={c} zone={z} onMove={(to) => move(c.id, to)} />
                ))}
              </Box>
            ))}
          </div>
        </DndContext>
        <p className="status" role="status">
          {message}
        </p>
        <button type="button" onClick={closeChallenge}>
          {t('closeChallenge')}
        </button>
      </main>
    </div>
  );
}
