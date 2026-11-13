import { DndContext, KeyboardSensor, type KeyboardCoordinateGetter, PointerSensor, TouchSensor, useSensor, useSensors, type Announcements, type DragEndEvent } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { MoveRight, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GroupId, PanelPlayerList } from "@patio/contracts";
import { PageTitle } from "../../components/page-title";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/query-states";
import { Button } from "../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { useSession } from "../../auth/session-store";
import { GroupColumn, type Target } from "./group-column";
import { GroupDialogs, type GroupAction } from "./group-dialogs";
import { useGroups } from "./use-groups";
import { BOARD_KEY, useMovePlayers } from "./use-move-players";

// Con teclado, las flechas izquierda y derecha saltan a la columna vecina (el paso por defecto de 25 px no alcanza para cruzar una columna).
const columnJump: KeyboardCoordinateGetter = (event, { context: { active, droppableRects, droppableContainers, collisionRect } }) => {
  if (!active || !collisionRect || (event.code !== "ArrowRight" && event.code !== "ArrowLeft")) return undefined;
  event.preventDefault();
  const dir = event.code === "ArrowRight" ? 1 : -1;
  const here = collisionRect.left + collisionRect.width / 2;
  let best: { center: number; top: number } | null = null;
  for (const c of droppableContainers.getEnabled()) {
    const r = droppableRects.get(c.id);
    if (!r) continue;
    const center = r.left + r.width / 2;
    if ((center - here) * dir > 1 && (best === null || (center - best.center) * dir < 0)) best = { center, top: r.top };
  }
  return best ? { x: best.center - collisionRect.width / 2, y: best.top + 48 } : undefined;
};

export function GroupsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isAdmin = useSession((s) => s.account?.role === "administrator");
  const groups = useGroups();
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const [action, setAction] = useState<GroupAction | null>(null);

  const columns = useMemo<Target[]>(
    () => [...(isAdmin ? [{ id: null, name: t("groups.noGroup") }] : []), ...(groups.data ?? []).map((g) => ({ id: g.id, name: g.name }))],
    [isAdmin, t, groups.data],
  );
  const nameOf = useCallback((id: GroupId | null) => columns.find((c) => c.id === id)?.name ?? "", [columns]);
  const move = useMovePlayers(nameOf);
  const targetsFor = (columnId: string | null) => columns.filter((c) => c.id !== columnId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnJump }),
  );

  const nicknameOf = (id: string) =>
    qc
      .getQueriesData<PanelPlayerList>({ queryKey: BOARD_KEY })
      .flatMap(([, d]) => d?.items ?? [])
      .find((p) => p.id === id)?.nickname ?? id;
  const columnOf = (overId: string | number) => columns.find((c) => (c.id ?? "none") === overId);
  const colName = (overId: string | number) => columnOf(overId)?.name ?? "";
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("groups.dnd.start", { name: nicknameOf(String(active.id)) }),
    onDragOver: ({ active, over }) => (over ? t("groups.dnd.over", { name: nicknameOf(String(active.id)), group: colName(over.id) }) : undefined),
    onDragEnd: ({ active, over }) => (over ? t("groups.dnd.end", { name: nicknameOf(String(active.id)), group: colName(over.id) }) : t("groups.dnd.cancel", { name: nicknameOf(String(active.id)) })),
    onDragCancel: ({ active }) => t("groups.dnd.cancel", { name: nicknameOf(String(active.id)) }),
  };

  // Si el jugador esta seleccionado se mueve toda la seleccion; si no, solo el.
  const moveFrom = (playerId: string, target: GroupId | null) => {
    const ids = selection.has(playerId) ? [...selection] : [playerId];
    void move(ids, target).then((ok) => ok && selection.has(playerId) && setSelection(new Set()));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const column = over ? columnOf(over.id) : undefined;
    if (column) moveFrom(String(active.id), column.id);
  };
  const toggle = (id: string) =>
    setSelection((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageTitle>{t("nav.groups")}</PageTitle>
        <Button onClick={() => setAction({ kind: "create" })}>
          <Plus aria-hidden="true" className="size-5" />
          {t("groups.create")}
        </Button>
      </div>
      <p className="text-text-muted">{t("groups.help")}</p>

      {selection.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary-soft p-3">
          <p aria-live="polite" className="font-medium">
            {t("groups.selected", { count: selection.size })}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoveRight aria-hidden="true" className="size-5" />
                {t("groups.moveSelected")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {columns.map((c) => (
                <DropdownMenuItem key={c.id ?? "none"} onSelect={() => void move([...selection], c.id).then((ok) => ok && setSelection(new Set()))}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" onClick={() => setSelection(new Set())}>
            {t("groups.clearSelection")}
          </Button>
        </div>
      )}

      {groups.isPending && <ListSkeleton />}
      {groups.isError && <ErrorState error={groups.error} onRetry={() => void groups.refetch()} />}
      {groups.isSuccess && columns.length === 0 && <EmptyState text={t("groups.empty")} />}
      {groups.isSuccess && columns.length > 0 && (
        <DndContext
          sensors={sensors}
          onDragEnd={onDragEnd}
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: t("groups.dnd.instructions") },
          }}
        >
          <div className="flex items-start gap-4 overflow-x-auto pb-4">
            {isAdmin && <GroupColumn key="none" group={null} isAdmin selection={selection} onToggle={toggle} targetsFor={targetsFor} onMove={moveFrom} onAction={setAction} />}
            {groups.data.map((g) => (
              <GroupColumn key={g.id} group={g} isAdmin={isAdmin} selection={selection} onToggle={toggle} targetsFor={targetsFor} onMove={moveFrom} onAction={setAction} />
            ))}
          </div>
        </DndContext>
      )}

      <GroupDialogs action={action} onClose={() => setAction(null)} />
    </div>
  );
}
