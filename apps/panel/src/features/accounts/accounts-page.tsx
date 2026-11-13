import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Mail, Trash2, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { AccountSummary, InvitationResponse } from "@patio/contracts";
import { accountDeletionImpact, deleteAccount, inviteModerator, listAccounts, resetPassword, updateAccount, updateGroup } from "../../api/panel-api";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { DeletionImpactView } from "../../components/deletion-impact";
import { FormError } from "../../components/form-error";
import { FormField } from "../../components/form-field";
import { PageTitle } from "../../components/page-title";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/query-states";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Table, Td, Th } from "../../components/ui/table";
import { useToasts } from "../../components/ui/toast-store";
import { useSession } from "../../auth/session-store";
import { formatDate, formatDateTime } from "../../lib/format";
import { GROUPS_KEY, useGroups } from "../groups/use-groups";

// Limites de InviteModeratorRequest.email y TemporaryPassword (panel.schema.json).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 15;
const PASSWORD_MAX = 128;
const ACCOUNTS_KEY = ["accounts"] as const;

type Action = { kind: "reset" | "groups" | "delete" | "toggle"; account: AccountSummary } | null;

function InviteCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [bad, setBad] = useState(false);
  const [sent, setSent] = useState<InvitationResponse | null>(null);
  const m = useMutation({
    mutationFn: (e: string) => inviteModerator(e),
    onSuccess: (r) => {
      setSent(r);
      setEmail("");
      void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    const ok = EMAIL.test(v) && v.length <= EMAIL_MAX;
    setBad(!ok);
    if (ok) m.mutate(v);
  };
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t("accounts.inviteTitle")}</h2>
      <p className="text-sm text-text-muted">{t("accounts.inviteHint")}</p>
      <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-2">
        <div className="min-w-64 flex-1">
          <FormField id="inv-email" type="email" autoComplete="off" label={t("auth.email")} maxLength={EMAIL_MAX} value={email} onChange={(e) => setEmail(e.target.value)} error={bad ? t("accounts.emailBad") : null} />
        </div>
        <Button type="submit" disabled={m.isPending}>
          <Mail aria-hidden="true" className="size-5" />
          {t("accounts.invite")}
        </Button>
      </form>
      <FormError error={m.error} />
      {sent && (
        <div role="status" className="flex flex-col gap-1 rounded-lg bg-success-soft p-3">
          <p className="font-medium">{t(sent.emailSent ? "accounts.inviteSent" : "accounts.inviteNotSent", { email: sent.email })}</p>
          <p className="text-sm">{t("accounts.inviteExpires", { when: formatDateTime(sent.expiresAt) })}</p>
          {sent.link && (
            <p className="break-all text-sm">
              {t("accounts.inviteDevLink")} <code>{sent.link}</code>
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-text-muted">{t("accounts.noInvitationList")}</p>
    </Card>
  );
}

function ResetDialog({ account, onClose }: { account: AccountSummary | null; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToasts();
  const [pw, setPw] = useState("");
  const [bad, setBad] = useState(false);
  const m = useMutation({
    mutationFn: () => resetPassword(account?.id ?? "", pw),
    onSuccess: () => {
      toast.push({ message: t("accounts.resetDone") });
      setPw("");
      onClose();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const ok = pw.length >= PASSWORD_MIN && pw.length <= PASSWORD_MAX;
    setBad(!ok);
    if (ok) m.mutate();
  };
  return (
    <Dialog open={account !== null} onClose={onClose} title={t("accounts.resetTitle", { email: account?.email })}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p>{t("accounts.resetBody")}</p>
        <FormField id="rp-pw" autoComplete="off" label={t("accounts.tempPassword")} hint={t("accounts.tempPasswordHint", { min: PASSWORD_MIN })} maxLength={PASSWORD_MAX} value={pw} onChange={(e) => setPw(e.target.value)} error={bad ? t("auth.tooShort", { min: PASSWORD_MIN }) : null} />
        <FormError error={m.error} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={m.isPending}>
            {t("accounts.resetConfirm")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function GroupsDialog({ account, onClose }: { account: AccountSummary | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const groups = useGroups();
  const owned = (groups.data ?? []).filter((g) => account && g.ownerIds.includes(account.id)).map((g) => g.id);
  const [picked, setPicked] = useState<string[] | null>(null);
  const current = picked ?? owned;
  const m = useMutation({
    mutationFn: async () => {
      if (!account) return;
      // ownerIds es una lista por grupo: se actualiza solo cada grupo que cambia.
      const changes = (groups.data ?? []).filter((g) => current.includes(g.id) !== owned.includes(g.id));
      await Promise.all(changes.map((g) => updateGroup(g.id, { ownerIds: current.includes(g.id) ? [...g.ownerIds, account.id] : g.ownerIds.filter((o) => o !== account.id) })));
    },
    onSuccess: () => {
      toast.push({ message: t("accounts.groupsSaved") });
      void qc.invalidateQueries({ queryKey: GROUPS_KEY });
      setPicked(null);
      onClose();
    },
  });
  return (
    <Dialog open={account !== null} onClose={() => { setPicked(null); onClose(); }} title={t("accounts.groupsTitle", { email: account?.email })}>
      <div className="flex flex-col gap-4">
        {groups.isPending && <ListSkeleton rows={3} />}
        {groups.isError && <ErrorState error={groups.error} onRetry={() => void groups.refetch()} />}
        {groups.isSuccess && groups.data.length === 0 && <EmptyState text={t("groups.empty")} />}
        {groups.isSuccess && groups.data.length > 0 && (
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 font-semibold">{t("accounts.groupsLegend")}</legend>
            {groups.data.map((g) => (
              <label key={g.id} className="flex min-h-touch items-center gap-2">
                <input type="checkbox" className="size-5 accent-primary" checked={current.includes(g.id)} onChange={(e) => setPicked(e.target.checked ? [...current, g.id] : current.filter((x) => x !== g.id))} />
                {g.name}
              </label>
            ))}
          </fieldset>
        )}
        <FormError error={m.error} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setPicked(null); onClose(); }}>
            {t("common.cancel")}
          </Button>
          <Button disabled={m.isPending || picked === null} onClick={() => m.mutate()}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function AccountsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const me = useSession((s) => s.account);
  const groups = useGroups();
  const [action, setAction] = useState<Action>(null);
  const q = useQuery({ queryKey: ACCOUNTS_KEY, queryFn: listAccounts, select: (d) => d.items });
  const close = () => setAction(null);
  const del = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      toast.push({ message: t("accounts.deleted") });
      void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      void qc.invalidateQueries({ queryKey: GROUPS_KEY });
      close();
    },
  });
  const toggle = useMutation({
    mutationFn: (a: AccountSummary) => updateAccount(a.id, { active: !a.active }),
    onSuccess: (a) => {
      toast.push({ message: t(a.active ? "accounts.activated" : "accounts.deactivated") });
      void qc.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      close();
    },
  });
  const groupNames = (id: AccountSummary["id"]) => (groups.data ?? []).filter((g) => g.ownerIds.includes(id)).map((g) => g.name).join(", ") || "-";
  const target = action?.account ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t("nav.accounts")}</PageTitle>
      <InviteCard />
      {q.isPending && <ListSkeleton />}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {q.isSuccess && q.data.length === 0 && <EmptyState text={t("accounts.empty")} />}
      {q.isSuccess && q.data.length > 0 && (
        <Table caption={t("nav.accounts")}>
          <thead>
            <tr>
              <Th>{t("auth.email")}</Th>
              <Th>{t("accounts.role")}</Th>
              <Th>{t("accounts.state")}</Th>
              <Th>{t("accounts.groups")}</Th>
              <Th>{t("accounts.lastLogin")}</Th>
              <Th>{t("challenges.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {q.data.map((a) => (
              <tr key={a.id}>
                <Td>
                  {a.email} {a.id === me?.id && <Badge>{t("challenges.you")}</Badge>}
                </Td>
                <Td>{t(`accounts.roles.${a.role}`)}</Td>
                <Td>{a.active ? (a.mustChangePassword ? t("accounts.pendingPassword") : t("accounts.active")) : t("accounts.inactive")}</Td>
                <Td>{a.role === "moderator" ? groupNames(a.id) : t("accounts.allGroups")}</Td>
                <Td>{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : formatDate(a.createdAt) + " (" + t("accounts.neverLogged") + ")"}</Td>
                <Td>
                  {a.role === "moderator" && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setAction({ kind: "groups", account: a })}>
                        <Users aria-hidden="true" className="size-4" />
                        {t("accounts.assignGroups")}
                      </Button>
                      <Button variant="outline" onClick={() => setAction({ kind: "reset", account: a })}>
                        <KeyRound aria-hidden="true" className="size-4" />
                        {t("accounts.resetPassword")}
                      </Button>
                      <Button variant="outline" onClick={() => setAction({ kind: "toggle", account: a })}>
                        {t(a.active ? "accounts.deactivate" : "accounts.activate")}
                      </Button>
                      <Button variant="outline" onClick={() => setAction({ kind: "delete", account: a })}>
                        <Trash2 aria-hidden="true" className="size-4" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <ResetDialog account={action?.kind === "reset" ? target : null} onClose={close} />
      <GroupsDialog key={action?.kind === "groups" ? target?.id : "none"} account={action?.kind === "groups" ? target : null} onClose={close} />
      <ConfirmDialog
        open={action?.kind === "toggle"}
        onClose={close}
        title={t(target?.active ? "accounts.deactivateTitle" : "accounts.activateTitle", { email: target?.email })}
        confirmLabel={t(target?.active ? "accounts.deactivate" : "accounts.activate")}
        onConfirm={() => target && toggle.mutate(target)}
        pending={toggle.isPending}
        error={toggle.error}
      >
        <p>{t(target?.active ? "accounts.deactivateBody" : "accounts.activateBody")}</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={action?.kind === "delete"}
        onClose={close}
        title={t("accounts.deleteTitle", { email: target?.email })}
        confirmLabel={t("accounts.deleteConfirm")}
        onConfirm={() => target && del.mutate(target.id)}
        pending={del.isPending}
        error={del.error}
      >
        {target && action?.kind === "delete" && <DeletionImpactView queryKey={["accounts", "impact", target.id]} fetcher={() => accountDeletionImpact(target.id)} warning={t("accounts.deleteWarning")} />}
      </ConfirmDialog>
    </div>
  );
}
