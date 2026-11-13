import type { DndContextProps } from '@dnd-kit/core';
import { t } from '../i18n/texts';

/** Instrucciones y anuncios de dnd-kit desde el catalogo. `labelOf` traduce un id de pieza o zona a texto. */
export function dndAccessibility(labelOf: (id: unknown) => string): DndContextProps['accessibility'] {
  return {
    screenReaderInstructions: { draggable: t('dragInstructions') },
    announcements: {
      onDragStart: ({ active }) => t('dragStart', { item: labelOf(active.id) }),
      onDragOver: ({ active, over }) => (over ? t('dragOver', { item: labelOf(active.id), target: labelOf(over.id) }) : undefined),
      onDragEnd: ({ active }) => t('dragEnd', { item: labelOf(active.id) }),
      onDragCancel: ({ active }) => t('dragCancel', { item: labelOf(active.id) }),
    },
  };
}
