import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { GroupId, PanelPlayer, PanelPlayerList } from "@patio/contracts";
import { movePlayers } from "../../api/panel-api";
import { useErrorText } from "../../components/query-states";
import { useToasts } from "../../components/ui/toast-store";

export const BOARD_KEY = ["players", "board"] as const;
export const columnKey = (groupId: string | null) => [...BOARD_KEY, groupId ?? "none"] as const;

/**
 * Mover jugadores con actualizacion optimista sobre las listas de las columnas. Si el servidor rechaza
 * (GROUP_FULL, FORBIDDEN_SCOPE...) se restaura lo anterior y se avisa por codigo. El aviso de exito trae "Deshacer",
 * que manda el movimiento inverso (agrupado por grupo de origen).
 */
export function useMovePlayers(groupName: (id: GroupId | null) => string) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const errorText = useErrorText();
  const push = useToasts((s) => s.push);

  const move = useCallback(
    async function run(ids: readonly string[], target: GroupId | null, isUndo = false): Promise<boolean> {
      const snapshot = qc.getQueriesData<PanelPlayerList>({ queryKey: BOARD_KEY });
      const moving: PanelPlayer[] = [];
      for (const [, data] of snapshot) for (const p of data?.items ?? []) if (ids.includes(p.id) && p.groupId !== target) moving.push(p);
      if (moving.length === 0) return true;
      const first = moving[0];
      if (!first) return true;
      const movingIds = new Set(moving.map((p) => p.id));
      const origin = new Map(moving.map((p) => [p.id, p.groupId]));

      for (const [key, data] of snapshot) {
        if (!data) continue;
        const col = key[2] === "none" ? null : String(key[2]);
        const kept = data.items.filter((p) => !movingIds.has(p.id));
        const items = col === target ? [...kept, ...moving.map((p) => ({ ...p, groupId: target }))].sort((a, b) => a.id.localeCompare(b.id)) : kept;
        qc.setQueryData(key, { ...data, items });
      }
      try {
        await movePlayers({ playerIds: [first.id, ...moving.slice(1).map((p) => p.id)], groupId: target });
      } catch (error) {
        for (const [key, data] of snapshot) qc.setQueryData(key, data);
        push({ message: errorText(error) });
        return false;
      } finally {
        void qc.invalidateQueries({ queryKey: BOARD_KEY });
        void qc.invalidateQueries({ queryKey: ["groups"] });
      }
      if (isUndo) {
        push({ message: t("groups.undone") });
        return true;
      }
      push({
        message: t("groups.moved", { count: moving.length, group: groupName(target) }),
        action: {
          label: t("groups.undo"),
          run: () => {
            const byOrigin = new Map<GroupId | null, string[]>();
            for (const [id, from] of origin) byOrigin.set(from, [...(byOrigin.get(from) ?? []), id]);
            for (const [from, list] of byOrigin) void run(list, from, true);
          },
        },
      });
      return true;
    },
    [qc, t, errorText, push, groupName],
  );
  return move;
}
