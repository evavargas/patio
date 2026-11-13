import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { GripVertical, MoveRight, MoreVertical, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GroupId, PanelGroup, PanelPlayer } from "@patio/contracts";
import { listPlayers } from "../../api/panel-api";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/query-states";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { cn } from "../../lib/cn";
import type { GroupAction } from "./group-dialogs";
import { columnKey } from "./use-move-players";

export interface Target {
  id: GroupId | null;
  name: string;
}
const BOARD_LIMIT = 100;

function PlayerCard({ player, selected, onToggle, targets, onMove }: { player: PanelPlayer; selected: boolean; onToggle: () => void; targets: Target[]; onMove: (target: GroupId | null) => void }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: player.id });
  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("relative flex items-center gap-1 rounded-md border-2 bg-surface-raised p-1", selected ? "border-primary" : "border-border", isDragging && "z-10 shadow-floating")}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t("groups.drag", { name: player.nickname })}
        className="flex min-h-touch touch-none items-center rounded-md px-1 text-text-muted hover:bg-primary-soft"
      >
        <GripVertical aria-hidden="true" className="size-5" />
      </button>
      <div className="flex min-h-touch min-w-0 flex-1 items-center gap-2">
        <input type="checkbox" className="size-5 shrink-0 accent-primary" checked={selected} onChange={onToggle} aria-label={t("groups.select", { name: player.nickname })} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{player.nickname}</span>
          <span className="block text-sm text-text-muted">{t("groups.cardMeta", { id: player.id.slice(0, 6), level: player.level })}</span>
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-2" aria-label={t("groups.moveTo", { name: player.nickname })}>
            <MoveRight aria-hidden="true" className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {targets.map((target) => (
            <DropdownMenuItem key={target.id ?? "none"} onSelect={() => onMove(target.id)}>
              {target.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

interface Props {
  group: PanelGroup | null; // null = "Sin grupo"
  isAdmin: boolean;
  selection: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** Destinos para "Mover a...", sin la columna actual. */
  targetsFor: (columnId: GroupId | null) => Target[];
  onMove: (playerId: string, target: GroupId | null) => void;
  onAction: (a: GroupAction) => void;
}

export function GroupColumn({ group, isAdmin, selection, onToggle, targetsFor, onMove, onAction }: Props) {
  const { t } = useTranslation();
  const id = group?.id ?? null;
  const { setNodeRef, isOver } = useDroppable({ id: id ?? "none" });
  const q = useQuery({ queryKey: columnKey(id), queryFn: () => listPlayers({ groupId: id ?? "none", limit: BOARD_LIMIT }) });
  const count = group?.playerCount ?? q.data?.items.length ?? 0;
  const full = group !== null && count >= group.maxSize;
  const title = group?.name ?? t("groups.noGroup");
  const headingId = `col-${id ?? "none"}`;

  return (
    <section ref={setNodeRef} aria-labelledby={headingId} className={cn("flex w-72 shrink-0 flex-col gap-3 rounded-lg border-2 bg-surface p-3", isOver ? "border-primary" : "border-border")}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id={headingId} className="truncate text-lg font-bold">
            {title}
          </h2>
          {group ? (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span>{t("groups.capacity", { count, max: group.maxSize })}</span>
              {full && (
                <Badge className="bg-warning-soft">
                  <TriangleAlert aria-hidden="true" className="size-4" />
                  {t("groups.full")}
                </Badge>
              )}
              {!group.active && <Badge>{t("groups.inactive")}</Badge>}
            </p>
          ) : (
            <p className="text-sm">{t("groups.playersCount", { count })}</p>
          )}
        </div>
        {group && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-2" aria-label={t("groups.actions", { name: group.name })}>
                <MoreVertical aria-hidden="true" className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => onAction({ kind: "code", group })}>{t("groups.viewCode")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction({ kind: "regenerate", group })}>{t("groups.regenerate")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction({ kind: "edit", group })}>{t("common.edit")}</DropdownMenuItem>
              {isAdmin && <DropdownMenuItem onSelect={() => onAction({ kind: "delete", group })}>{t("common.delete")}</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      {q.isPending && <ListSkeleton rows={3} />}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {q.isSuccess && q.data.items.length === 0 && <EmptyState text={t("groups.emptyColumn")} />}
      {q.isSuccess && q.data.items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {q.data.items.map((p) => (
            <PlayerCard key={p.id} player={p} selected={selection.has(p.id)} onToggle={() => onToggle(p.id)} targets={targetsFor(id)} onMove={(target) => onMove(p.id, target)} />
          ))}
        </ul>
      )}
      {q.isSuccess && q.data.nextCursor !== null && <p className="text-sm text-text-muted">{t("groups.truncated", { count: BOARD_LIMIT })}</p>}
    </section>
  );
}
