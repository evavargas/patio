import { useInfiniteQuery } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import type { PanelPlayer } from "@patio/contracts";
import { listPlayers } from "../../api/panel-api";
import { PageTitle } from "../../components/page-title";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/query-states";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Table, Td, Th } from "../../components/ui/table";
import { useSession } from "../../auth/session-store";
import { formatDate, formatDateTime } from "../../lib/format";
import { useGroups } from "../groups/use-groups";
import { PlayerDialog } from "./player-dialog";

const FAMILIES = ["resolver", "descubrir", "crear"] as const;
const intParam = (v: string | null): number | undefined => (v !== null && /^\d{1,4}$/.test(v) ? Number(v) : undefined);

export function PlayersPage() {
  const { t } = useTranslation();
  const isAdmin = useSession((s) => s.account?.role === "administrator");
  const [params, setParams] = useSearchParams();
  const group = params.get("group") ?? "";
  const level = intParam(params.get("level"));
  const inactive = intParam(params.get("inactive"));
  const selected = params.get("player");
  const groups = useGroups();

  const setParam = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "") next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: key !== "player" });

  const groupName = (id: string | null) => (id === null ? t("players.noGroup") : (groups.data?.find((g) => g.id === id)?.name ?? id));

  const q = useInfiniteQuery({
    queryKey: ["players", "list", { group, level, inactive }],
    initialPageParam: "",
    queryFn: ({ pageParam }) => listPlayers({ groupId: group || undefined, level, inactiveDays: inactive, cursor: pageParam || undefined, limit: 25 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  const columns = useMemo<ColumnDef<PanelPlayer>[]>(
    () => [
      {
        id: "nickname",
        header: t("players.nickname"),
        cell: ({ row }) => (
          <button type="button" className="min-h-touch font-semibold underline" onClick={() => setParam("player", row.original.id)}>
            {row.original.nickname}
          </button>
        ),
      },
      { id: "id", header: t("players.shortId"), cell: ({ row }) => <span className="font-mono">{row.original.id.slice(0, 6)}</span> },
      { id: "group", header: t("players.group"), cell: ({ row }) => groupName(row.original.groupId) },
      { accessorKey: "level", header: t("players.level") },
      { accessorKey: "score", header: t("players.score") },
      {
        id: "progress",
        header: t("players.progress"),
        cell: ({ row }) => FAMILIES.map((f) => `${t(`family.${f}`)} ${row.original.countsByFamily[f] ?? 0}`).join(" · "),
      },
      { id: "registered", header: t("players.registered"), cell: ({ row }) => formatDate(row.original.createdAt) },
      { id: "lastActive", header: t("players.lastActive"), cell: ({ row }) => formatDateTime(row.original.lastActiveAt) },
    ],
    // groupName y setParam dependen de groups.data y params
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, groups.data, params],
  );
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t("nav.players")}</PageTitle>

      <form role="search" aria-label={t("players.filters")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-group">{t("players.group")}</Label>
          <Select id="f-group" value={group} onChange={(e) => setParam("group", e.target.value)}>
            <option value="">{t("players.allGroups")}</option>
            {isAdmin && <option value="none">{t("players.noGroup")}</option>}
            {groups.data?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-level">{t("players.level")}</Label>
          <Input id="f-level" inputMode="numeric" value={level ?? ""} onChange={(e) => setParam("level", e.target.value.replace(/\D/g, ""))} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-inactive">{t("players.inactiveDays")}</Label>
          <Input id="f-inactive" inputMode="numeric" value={inactive ?? ""} onChange={(e) => setParam("inactive", e.target.value.replace(/\D/g, ""))} />
        </div>
        <div className="flex items-end">
          <Button variant="outline" onClick={() => setParams({})}>
            {t("players.clearFilters")}
          </Button>
        </div>
      </form>

      {q.isPending && <ListSkeleton />}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {q.isSuccess && rows.length === 0 && <EmptyState text={t("players.empty")} />}
      {q.isSuccess && rows.length > 0 && (
        <>
          <Table caption={t("nav.players")}>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <Th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</Th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((c) => (
                    <Td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center gap-4">
            <p aria-live="polite">{t("players.shown", { count: rows.length })}</p>
            {q.hasNextPage && (
              <Button variant="outline" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                {t("players.loadMore")}
              </Button>
            )}
          </div>
        </>
      )}

      <PlayerDialog playerId={selected} groupName={groupName} onClose={() => setParam("player", "")} />
    </div>
  );
}
