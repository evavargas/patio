import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CircleAlert, Lock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ChallengeId, DayKey, GroupId, PanelDaySet } from "@patio/contracts";
import { daySetDeletionImpact, deleteDaySet, listChallenges, publishDaySet, saveDaySet, unpublishDaySet } from "../../api/panel-api";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { DeletionImpactView } from "../../components/deletion-impact";
import { FormError } from "../../components/form-error";
import { ErrorState, ListSkeleton } from "../../components/query-states";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useToasts } from "../../components/ui/toast-store";
import { formatDay, formatDateTime } from "../../lib/format";

const REC_MIN = 3;
const REC_MAX = 5;

interface Props {
  date: DayKey;
  groupId: GroupId | null;
  set: PanelDaySet | undefined;
  today: string;
  isAdmin: boolean;
  onDeleted: () => void;
}

export function DaySetEditor({ date, groupId, set, today, isAdmin, onDeleted }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const [ids, setIds] = useState<ChallengeId[]>(set?.challengeIds ?? []);
  const [filter, setFilter] = useState("");
  const [announce, setAnnounce] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lib = useQuery({ queryKey: ["challenges", "pick"], queryFn: () => listChallenges({ status: "active", limit: 100 }), select: (d) => d.items });

  // Motivo de solo lectura: lo dice el texto, no solo el icono.
  const readOnlyReason = set?.lockedAt ? t("daySets.lockedReason", { when: formatDateTime(set.lockedAt) }) : date < today ? t("daySets.pastReason") : null;
  const readOnly = readOnlyReason !== null;
  const dirty = ids.join() !== (set?.challengeIds ?? []).join();
  const inRange = ids.length >= REC_MIN && ids.length <= REC_MAX;
  const title = (id: string) => lib.data?.find((c) => c.id === id)?.challenge.text ?? t("daySets.unknownChallenge", { id: id.slice(0, 6) });

  const refresh = () => qc.invalidateQueries({ queryKey: ["day-sets"] });
  const save = useMutation({
    mutationFn: () => saveDaySet({ date, groupId, challengeIds: ids }),
    onSuccess: () => {
      toast.push({ message: t("daySets.saved") });
      void refresh();
    },
  });
  const publish = useMutation({
    mutationFn: async () => publishDaySet(dirty || !set ? (await saveDaySet({ date, groupId, challengeIds: ids })).id : set.id),
    onSuccess: () => {
      toast.push({ message: t("daySets.published") });
      void refresh();
    },
  });
  const unpublish = useMutation({
    mutationFn: () => unpublishDaySet(set?.id ?? ""),
    onSuccess: () => {
      toast.push({ message: t("daySets.unpublished") });
      void refresh();
    },
  });
  const del = useMutation({
    mutationFn: () => deleteDaySet(set?.id ?? ""),
    onSuccess: () => {
      toast.push({ message: t("daySets.deleted") });
      void refresh();
      setConfirmDelete(false);
      onDeleted();
    },
  });

  const move = (i: number, to: number) => {
    const next = [...ids];
    const [item] = next.splice(i, 1);
    if (item === undefined) return;
    next.splice(to, 0, item);
    setIds(next);
    setAnnounce(t("daySets.moved", { title: title(item), pos: to + 1, total: next.length }));
  };
  const add = (id: ChallengeId) => {
    setIds([...ids, id]);
    setAnnounce(t("daySets.added", { title: title(id), total: ids.length + 1 }));
  };
  const remove = (id: ChallengeId) => {
    setIds(ids.filter((x) => x !== id));
    setAnnounce(t("daySets.removed", { title: title(id), total: ids.length - 1 }));
  };
  const error = save.error ?? publish.error ?? unpublish.error;
  const busy = save.isPending || publish.isPending || unpublish.isPending;
  const candidates = (lib.data ?? []).filter((c) => c.challenge.text.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <section aria-labelledby="ds-title" className="flex flex-col gap-4">
      <h2 id="ds-title" className="text-xl font-bold">
        {t("daySets.editorTitle", { date: formatDay(date, true) })}
      </h2>
      <p className="flex flex-wrap items-center gap-2">
        {set ? <span className="rounded-full bg-primary-soft px-2 py-0.5 text-sm font-medium">{t(`daySets.status.${set.status}`)}</span> : <span className="text-text-muted">{t("daySets.noSet")}</span>}
        {set?.status === "published" && !readOnly && <span className="text-sm text-text-muted">{t("daySets.editReverts")}</span>}
      </p>
      {readOnlyReason && (
        <p role="note" className="flex items-start gap-2 rounded-lg bg-info-soft p-3 font-medium">
          <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-info" />
          <span>{readOnlyReason}</span>
        </p>
      )}
      {!readOnly && ids.length > 0 && !inRange && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 font-medium">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
          <span>{t("daySets.rangeWarning", { min: REC_MIN, max: REC_MAX, count: ids.length })}</span>
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">{t("daySets.inSet", { count: ids.length })}</h3>
          {ids.length === 0 ? (
            <p className="text-text-muted">{t("daySets.setEmpty")}</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {ids.map((id, i) => (
                <li key={id} className="flex flex-wrap items-center gap-2 rounded-md border-2 border-border p-2">
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{i + 1}. </span>
                    {title(id)}
                  </span>
                  {!readOnly && (
                    <span className="flex gap-1">
                      <Button variant="outline" aria-label={t("daySets.moveUp", { title: title(id) })} disabled={i === 0} onClick={() => move(i, i - 1)}>
                        <ArrowUp aria-hidden="true" className="size-5" />
                      </Button>
                      <Button variant="outline" aria-label={t("daySets.moveDown", { title: title(id) })} disabled={i === ids.length - 1} onClick={() => move(i, i + 1)}>
                        <ArrowDown aria-hidden="true" className="size-5" />
                      </Button>
                      <Button variant="outline" aria-label={t("daySets.remove", { title: title(id) })} onClick={() => remove(id)}>
                        <Trash2 aria-hidden="true" className="size-5" />
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
          <p aria-live="polite" className="sr-only">
            {announce}
          </p>
        </Card>

        {!readOnly && (
          <Card className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">{t("daySets.library")}</h3>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ds-filter">{t("daySets.search")}</Label>
              <Input id="ds-filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
            </div>
            {lib.isPending && <ListSkeleton rows={3} />}
            {lib.isError && <ErrorState error={lib.error} onRetry={() => void lib.refetch()} />}
            {lib.isSuccess && candidates.length === 0 && <p className="text-text-muted">{t("challenges.empty")}</p>}
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {candidates.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border-2 border-border p-2">
                  <span className="min-w-0 flex-1">
                    {c.challenge.text}
                    <span className="block text-sm text-text-muted">
                      {t(`challenges.mechanics.${c.challenge.mechanic.type}`)} · {t("challenges.difficulty")} {c.challenge.difficulty}
                    </span>
                  </span>
                  <Button variant="outline" aria-label={t("daySets.add", { title: c.challenge.text })} disabled={ids.includes(c.id)} onClick={() => add(c.id)}>
                    <Plus aria-hidden="true" className="size-5" />
                    {t("daySets.addShort")}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <FormError error={error} />
      <div className="flex flex-wrap gap-2">
        {!readOnly && (
          <>
            <Button variant="outline" disabled={busy || !dirty} onClick={() => save.mutate()}>
              {t("common.save")}
            </Button>
            {(set?.status !== "published" || dirty) && (
              <Button disabled={busy || ids.length === 0} onClick={() => publish.mutate()}>
                {t(dirty || !set ? "daySets.saveAndPublish" : "daySets.publish")}
              </Button>
            )}
            {set?.status === "published" && !dirty && (
              <Button variant="outline" disabled={busy} onClick={() => unpublish.mutate()}>
                {t("daySets.unpublish")}
              </Button>
            )}
          </>
        )}
        {isAdmin && set && (
          <Button variant="outline" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" className="size-5" />
            {t("common.delete")}
          </Button>
        )}
      </div>
      {!readOnly && dirty && <p className="text-sm text-text-muted">{t("daySets.unsaved")}</p>}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("daySets.deleteTitle", { date: formatDay(date, true) })}
        confirmLabel={t("daySets.deleteConfirm")}
        onConfirm={() => del.mutate()}
        pending={del.isPending}
        error={del.error}
      >
        {set && <DeletionImpactView queryKey={["day-sets", "impact", set.id]} fetcher={() => daySetDeletionImpact(set.id)} warning={t("daySets.deleteWarning")} />}
      </ConfirmDialog>
    </section>
  );
}
