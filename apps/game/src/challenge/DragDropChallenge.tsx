import type { DragDropConfigV1 } from '@patio/contracts';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { t } from '../i18n/texts';
import { dndAccessibility } from './dnd-a11y';
import type { MechanicProps } from './mechanic-props';
import { isDragDropSolved } from './rules';

const POOL = -1;
const assetName = (assetId: string) => assetId.replaceAll('-', ' '); // sin manifiesto de assets todavia

// Las piezas son identicas: no hay teclado por pieza (aria-hidden); cada contenedor tiene botones de poner y sacar.
function Piece({ id }: { id: number }) {
  const { setNodeRef, listeners, transform, isDragging } = useDraggable({ id: `piece-${id}` });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      aria-hidden="true"
      className="piece"
      data-dragging={isDragging}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
    />
  );
}

function Zone({ id, children, ...rest }: { id: string; children: React.ReactNode; 'aria-labelledby': string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className="zone" data-over={isOver} {...rest}>
      {children}
    </section>
  );
}

export function DragDropChallenge({ config, isDone, onFeedback, onAchieved }: MechanicProps<DragDropConfigV1>) {
  const [zones, setZones] = useState<number[]>(() => Array.from({ length: config.items.count }, () => POOL));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const itemName = assetName(config.items.assetId);
  const containerName = (j: number) => t('containerName', { item: assetName(config.containers.assetId), n: j + 1 });

  const commit = (next: number[]) => {
    setZones(next);
    const counts = Array.from({ length: config.containers.count }, (_, j) => next.filter((z) => z === j).length);
    const poolLeft = next.filter((z) => z === POOL).length;
    if (poolLeft > 0) return onFeedback(null);
    if (isDragDropSolved(counts, poolLeft, config.rule)) {
      onFeedback(null);
      onAchieved();
    } else onFeedback('tryOtherStrategy');
  };
  const moveTo = (piece: number, zone: number) => commit(zones.map((z, i) => (i === piece ? zone : z)));
  const addTo = (j: number) => {
    const piece = zones.indexOf(POOL);
    if (piece >= 0) moveTo(piece, j);
  };
  const removeFrom = (j: number) => {
    const piece = zones.lastIndexOf(j);
    if (piece >= 0) moveTo(piece, POOL);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const piece = Number(String(e.active.id).replace('piece-', ''));
    const over = String(e.over?.id ?? '');
    if (over === 'pool') moveTo(piece, POOL);
    else if (over.startsWith('box-')) moveTo(piece, Number(over.slice(4)));
  };
  const labelOf = (id: unknown) => {
    const s = String(id);
    if (s === 'pool') return t('poolArea');
    if (s.startsWith('box-')) return containerName(Number(s.slice(4)));
    return itemName;
  };
  const poolLeft = zones.filter((z) => z === POOL).length;

  return (
    <DndContext sensors={sensors} onDragEnd={isDone ? undefined : onDragEnd} accessibility={dndAccessibility(labelOf)}>
      <Zone id="pool" aria-labelledby="zone-pool">
        <h2 id="zone-pool">{t('pool', { item: itemName })}</h2>
        <p>{t('poolLeft', { n: poolLeft })}</p>
        <ul className="pieces">
          {zones.map((z, i) => (z === POOL ? <Piece key={i} id={i} /> : null))}
        </ul>
      </Zone>
      <div className="zones">
        {Array.from({ length: config.containers.count }, (_, j) => {
          const inside = zones.filter((z) => z === j).length;
          return (
            <Zone key={j} id={`box-${j}`} aria-labelledby={`zone-${j}`}>
              <h2 id={`zone-${j}`}>{containerName(j)}</h2>
              <p>{t('containerCount', { n: inside })}</p>
              <ul className="pieces">
                {zones.map((z, i) => (z === j ? <Piece key={i} id={i} /> : null))}
              </ul>
              <div className="actions">
                <button type="button" className="secondary" disabled={isDone || poolLeft === 0} onClick={() => addTo(j)}>
                  {t('addOne', { name: containerName(j) })}
                </button>
                <button type="button" className="secondary" disabled={isDone || inside === 0} onClick={() => removeFrom(j)}>
                  {t('removeOne', { name: containerName(j) })}
                </button>
              </div>
            </Zone>
          );
        })}
      </div>
    </DndContext>
  );
}
