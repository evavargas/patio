import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import type { PanelChallenge } from "@patio/contracts";
import { archiveChallenge, duplicateChallenge, listChallenges } from "../../api/panel-api";
import { useSession } from "../../auth/session-store";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageTitle } from "../../components/page-title";
import { EmptyState, ErrorState, ListSkeleton, useErrorText } from "../../components/query-states";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Table, Td, Th } from "../../components/ui/table";
import { useToasts } from "../../components/ui/toast-store";
import { FAMILIES } from "./challenge-form";
import { ChallengeEditor } from "./challenge-editor";

const MECHANICS = ["dragDrop", "numberInput", "wordDrop"] as const;

export function ChallengesPage() {
  const [params, setParams] = useSearchParams();
  const edit = params.get("edit"); // "new" o el id del desafio
  const setParam = (key: string, value: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "") next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: key !== "edit" });
  if (edit !== null) return <ChallengeEditor id={edit === "new" ? null : edit} onDone={() => setParam("edit", "")} />;
  return <ChallengeList params={params} setParam={setParam} clear={() => setParams({})} />;
}

function ChallengeList({ params, setParam, clear }: { params: URLSearchParams; setParam: (k: string, v: string) => void; clear: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const errorText = useErrorText();
  const me = useSession((s) => s.account);
  const status = params.get("status") === "archived" ? "archived" : "active";
  const mechanic = params.get("mechanic") ?? "";
  const family = params.get("family") ?? "";
  const difficultyRaw = params.get("difficulty") ?? "";
  const difficulty = /^\d{1,2}$/.test(difficultyRaw) ? Number(difficultyRaw) : undefined;
  const mine = params.get("mine") === "true";
  const [toArchive, setToArchive] = useState<PanelChallenge | null>(null);

  const q = useInfiniteQuery({
    queryKey: ["challenges", "list", { status, mechanic, family, difficulty, mine }],
    initialPageParam: "",
    queryFn: ({ pageParam }) => listChallenges({ status, mechanic, family, difficulty, mine, cursor: pageParam || undefined, limit: 25 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];

  const dup = useMutation({
    mutationFn: (id: string) => duplicateChallenge(id),
    onSuccess: () => {
      toast.push({ message: t("challenges.duplicated") });
      void qc.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (e) => toast.push({ message: errorText(e) }),
  });
  const arch = useMutation({
    mutationFn: (id: string) => archiveChallenge(id),
    onSuccess: () => {
      toast.push({ message: t("challenges.archived") });
      void qc.invalidateQueries({ queryKey: ["challenges"] });
      setToArchive(null);
    },
  });
  const canEdit = (c: PanelChallenge) => me?.role === "administrator" || c.authorId === me?.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageTitle>{t("nav.challenges")}</PageTitle>
        <Button onClick={() => setParam("edit", "new")}>
          <Plus aria-hidden="true" className="size-5" />
          {t("challenges.create")}
        </Button>
      </div>

      <form role="search" aria-label={t("players.filters")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-status">{t("challenges.status")}</Label>
          <Select id="f-status" value={status} onChange={(e) => setParam("status", e.target.value === "active" ? "" : e.target.value)}>
            <option value="active">{t("challenges.statusActive")}</option>
            <option value="archived">{t("challenges.statusArchived")}</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-mechanic">{t("challenges.mechanic")}</Label>
          <Select id="f-mechanic" value={mechanic} onChange={(e) => setParam("mechanic", e.target.value)}>
            <option value="">{t("challenges.all")}</option>
            {MECHANICS.map((x) => (
              <option key={x} value={x}>
                {t(`challenges.mechanics.${x}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-family">{t("challenges.family")}</Label>
          <Select id="f-family" value={family} onChange={(e) => setParam("family", e.target.value)}>
            <option value="">{t("challenges.all")}</option>
            {FAMILIES.map((x) => (
              <option key={x} value={x}>
                {t(`family.${x}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-difficulty">{t("challenges.difficulty")}</Label>
          <Input id="f-difficulty" inputMode="numeric" value={difficulty ?? ""} onChange={(e) => setParam("difficulty", e.target.value.replace(/\D/g, ""))} />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex min-h-touch items-center gap-2">
            <input type="checkbox" className="size-5 accent-primary" checked={mine} onChange={(e) => setParam("mine", e.target.checked ? "true" : "")} />
            {t("challenges.mine")}
          </label>
          <Button variant="outline" onClick={clear}>
            {t("players.clearFilters")}
          </Button>
        </div>
      </form>

      {q.isPending && <ListSkeleton />}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {q.isSuccess && rows.length === 0 && <EmptyState text={t("challenges.empty")} />}
      {q.isSuccess && rows.length > 0 && (
        <>
          <Table caption={t("nav.challenges")}>
            <thead>
              <tr>
                <Th>{t("challenges.text")}</Th>
                <Th>{t("challenges.mechanic")}</Th>
                <Th>{t("challenges.difficulty")}</Th>
                <Th>{t("challenges.family")}</Th>
                <Th>{t("challenges.author")}</Th>
                <Th>{t("challenges.version")}</Th>
                <Th>{t("challenges.actions")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <Td className="min-w-64">{c.challenge.text}</Td>
                  <Td>{t(`challenges.mechanics.${c.challenge.mechanic.type}`)}</Td>
                  <Td>{c.challenge.difficulty}</Td>
                  <Td>{c.challenge.family ? t(`family.${c.challenge.family}`) : "-"}</Td>
                  <Td>{c.authorId === me?.id ? <Badge>{t("challenges.you")}</Badge> : t("challenges.other")}</Td>
                  <Td>{c.version}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      {canEdit(c) && c.status === "active" && (
                        <Button variant="outline" onClick={() => setParam("edit", c.id)}>
                          <Pencil aria-hidden="true" className="size-4" />
                          {t("common.edit")}
                        </Button>
                      )}
                      <Button variant="outline" disabled={dup.isPending} onClick={() => dup.mutate(c.id)}>
                        <Copy aria-hidden="true" className="size-4" />
                        {t("challenges.duplicate")}
                      </Button>
                      {canEdit(c) && c.status === "active" && (
                        <Button variant="outline" onClick={() => setToArchive(c)}>
                          <Archive aria-hidden="true" className="size-4" />
                          {t("challenges.archive")}
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center gap-4">
            <p aria-live="polite">{t("challenges.shown", { count: rows.length })}</p>
            {q.hasNextPage && (
              <Button variant="outline" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                {t("players.loadMore")}
              </Button>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={toArchive !== null}
        onClose={() => setToArchive(null)}
        title={t("challenges.archiveTitle")}
        confirmLabel={t("challenges.archive")}
        onConfirm={() => toArchive && arch.mutate(toArchive.id)}
        pending={arch.isPending}
        error={arch.error}
      >
        <p className="font-medium">{toArchive?.challenge.text}</p>
        <p>{t("challenges.archiveBody")}</p>
      </ConfirmDialog>
    </div>
  );
}
