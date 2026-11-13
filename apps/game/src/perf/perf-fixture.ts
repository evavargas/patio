import type { DayResponse } from '@patio/contracts';
import { useGameStore } from '../game-store';
import { layoutToys } from '../scene/toy-layout';

// En modo ?perf=1 no hay API: se carga un dia fijo para medir siempre la misma escena.
const PERF_PLAYER = 'PERFPLAYER01';
const PERF_DATE = '2000-01-01';

export function loadPerfFixture(): void {
  const items = ['a', 'b', 'c', 'd'].map((id) => ({
    challengeId: id,
    text: id,
    mechanic: {
      type: 'dragDrop',
      schemaVersion: 1,
      config: { items: { assetId: 'manzana', count: 4 }, containers: { assetId: 'bolsa', count: 2 }, rule: { type: 'equalShare' } },
    },
    difficulty: 1,
    assets: [],
  }));
  // JSON.parse devuelve any: los ids de marca del contrato no se pueden armar a mano sin afirmaciones de tipo.
  const day: DayResponse = JSON.parse(
    JSON.stringify({ serverTime: '2000-01-01T12:00:00Z', date: PERF_DATE, dayEndsAt: '2000-01-02T00:00:00Z', status: 'available', items, completedChallengeIds: [], score: 0 }),
  );
  useGameStore.setState({
    screen: 'yard',
    session: { playerId: PERF_PLAYER, token: '', nickname: '' },
    toys: layoutToys(PERF_PLAYER, PERF_DATE, items.length),
    day,
  });
}
