import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { PanelPlayer } from "@patio/contracts";
import { deletePlayer, getPlayer, playerDeletionImpact, reissueRecovery, updateNickname } from "../../api/panel-api";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { DeletionImpactView } from "../../components/deletion-impact";
import { FormError } from "../../components/form-error";
import { FormField } from "../../components/form-field";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/query-states";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Td, Table, Th } from "../../components/ui/table";
import { useToasts } from "../../components/ui/toast-store";
import { useSession } from "../../auth/session-store";
import { formatDate, formatDateTime, formatDay } from "../../lib/format";
import { SecretCodeDialog } from "./recovery-code-dialog";

const NICKNAME_MAX = 64; // mismo limite que UpdateNicknameRequest (los validadores de contracts usan ajv y eval: no van en el panel por la CSP)

function NicknameForm({ player }: { player: PanelPlayer }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const [value, setValue] = useState(player.nickname);
  const [touched, setTouched] = useState(false);
  const m = useMutation({
    mutationFn: () => updateNickname(player.id, { nickname: value.trim() }),
    onSuccess: () => {
      toast.push({ message: t("players.nicknameSaved") });
      void qc.invalidateQueries({ queryKey: ["players"] });
    },
  });
  const invalid = value.trim() === "" || value.trim().length > NICKNAME_MAX;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!invalid) m.mutate();
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <FormField
        id="nickname"
        label={t("players.nickname")}
        value={value}
        maxLength={NICKNAME_MAX}
        onChange={(e) => setValue(e.target.value)}
        error={touched && invalid ? t("auth.required") : null}
      />
      <FormError error={m.error} />
      <Button type="submit" variant="outline" className="self-start" disabled={m.isPending || value.trim() === player.nickname}>
        {t("players.saveNickname")}
      </Button>
    </form>
  );
}

export function PlayerDialog({ playerId, groupName, onClose }: { playerId: string | null; groupName: (id: string | null) => string; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const isAdmin = useSession((s) => s.account?.role === "administrator");
  const [confirm, setConfirm] = useState<"reissue" | "delete" | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["players", "detail", playerId], queryFn: () => getPlayer(playerId ?? ""), enabled: playerId !== null });
  const reissue = useMutation({
    mutationFn: () => reissueRecovery(playerId ?? ""),
    onSuccess: (r) => {
      setConfirm(null);
      setCode(r.recoveryCode);
    },
  });
  const del = useMutation({
    mutationFn: () => deletePlayer(playerId ?? ""),
    onSuccess: () => {
      setConfirm(null);
      toast.push({ message: t("players.deleted") });
      void qc.invalidateQueries({ queryKey: ["players"] });
      void qc.invalidateQueries({ queryKey: ["groups"] });
      onClose();
    },
  });
  const closeConfirm = () => setConfirm(null);
  const p = q.data?.player;

  return (
    <>
      <Dialog open={playerId !== null && code === null} onClose={onClose} title={p?.nickname ?? t("players.detail")} className="max-w-2xl">
        {q.isPending && <ListSkeleton rows={4} />}
        {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
        {q.data && p && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-text-muted">{t("players.id")}</dt>
              <dd className="font-mono">{p.id}</dd>
              <dt className="text-text-muted">{t("players.group")}</dt>
              <dd>{groupName(p.groupId)}</dd>
              <dt className="text-text-muted">{t("players.level")}</dt>
              <dd>{p.level}</dd>
              <dt className="text-text-muted">{t("players.score")}</dt>
              <dd>{p.score}</dd>
              <dt className="text-text-muted">{t("players.registered")}</dt>
              <dd>{formatDate(p.createdAt)}</dd>
              <dt className="text-text-muted">{t("players.lastActive")}</dt>
              <dd>{formatDateTime(p.lastActiveAt)}</dd>
            </dl>
            <section aria-labelledby="activity-h" className="flex flex-col gap-2">
              <h3 id="activity-h" className="font-semibold">
                {t("players.activityTitle")}
              </h3>
              <p className="text-sm text-text-muted">{t("players.activityNote")}</p>
              {q.data.activity.length === 0 ? (
                <EmptyState text={t("players.activityEmpty")} />
              ) : (
                <Table caption={t("players.activityTitle")}>
                  <thead>
                    <tr>
                      <Th>{t("common.date")}</Th>
                      <Th>{t("players.achieved")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.activity.map((a) => (
                      <tr key={a.date}>
                        <Td>{formatDay(a.date, true)}</Td>
                        <Td>{a.achieved}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </section>
            {isAdmin && <NicknameForm player={p} />}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm("reissue")}>
                {t("players.reissue")}
              </Button>
              {isAdmin && (
                <Button variant="outline" onClick={() => setConfirm("delete")}>
                  {t("players.delete")}
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={confirm === "reissue"}
        onClose={closeConfirm}
        title={t("players.reissueTitle")}
        confirmLabel={t("players.reissueConfirm")}
        onConfirm={() => reissue.mutate()}
        pending={reissue.isPending}
        error={reissue.error}
      >
        <p>{t("players.reissueBody")}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "delete"}
        onClose={closeConfirm}
        title={t("players.deleteTitle")}
        confirmLabel={t("players.deleteConfirm")}
        onConfirm={() => del.mutate()}
        pending={del.isPending}
        error={del.error}
      >
        <DeletionImpactView queryKey={["players", "impact", playerId]} fetcher={() => playerDeletionImpact(playerId ?? "")} warning={t("players.deleteWarning")} />
      </ConfirmDialog>

      <SecretCodeDialog title={t("players.newCodeTitle")} warning={t("players.newCodeWarning")} code={code} onClose={() => setCode(null)} />
    </>
  );
}
