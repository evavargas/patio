import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { PanelGroup } from "@patio/contracts";
import { createGroup, deleteGroup, groupDeletionImpact, regenerateGroupCode, updateGroup } from "../../api/panel-api";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { DeletionImpactView } from "../../components/deletion-impact";
import { FormError } from "../../components/form-error";
import { FormField } from "../../components/form-field";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { useToasts } from "../../components/ui/toast-store";
import { SecretCodeDialog } from "../players/recovery-code-dialog";
import { GROUPS_KEY } from "./use-groups";

// Limites de CreateGroupRequest/UpdateGroupRequest. No se usan los validadores de contracts: ajv necesita eval y la CSP no lo permite.
const NAME_MAX = 60;
const SIZE_MAX = 50;

export type GroupAction =
  | { kind: "create" }
  | { kind: "edit"; group: PanelGroup }
  | { kind: "code"; group: PanelGroup }
  | { kind: "regenerate"; group: PanelGroup }
  | { kind: "delete"; group: PanelGroup };

function GroupForm({ group, onClose }: { group?: PanelGroup; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const [name, setName] = useState(group?.name ?? "");
  const [size, setSize] = useState(String(group?.maxSize ?? SIZE_MAX));
  const [active, setActive] = useState(group?.active ?? true);
  const [touched, setTouched] = useState(false);
  const maxSize = Number(size);
  const nameBad = name.trim() === "" || name.trim().length > NAME_MAX;
  const sizeBad = !/^\d+$/.test(size) || maxSize < 1 || maxSize > SIZE_MAX;
  const m = useMutation({
    mutationFn: () => (group ? updateGroup(group.id, { name: name.trim(), maxSize, active }) : createGroup({ name: name.trim(), maxSize })),
    onSuccess: () => {
      toast.push({ message: t(group ? "groups.saved" : "groups.created") });
      void qc.invalidateQueries({ queryKey: GROUPS_KEY });
      onClose();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!nameBad && !sizeBad) m.mutate();
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormField id="g-name" label={t("groups.name")} value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} error={touched && nameBad ? t("auth.required") : null} />
      <FormField
        id="g-size"
        label={t("groups.maxSize")}
        inputMode="numeric"
        value={size}
        onChange={(e) => setSize(e.target.value)}
        hint={t("groups.maxSizeHint", { max: SIZE_MAX })}
        error={touched && sizeBad ? t("groups.maxSizeBad", { max: SIZE_MAX }) : null}
      />
      {group && (
        <div className="flex items-center gap-2">
          <input id="g-active" type="checkbox" className="size-5 accent-primary" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <Label htmlFor="g-active">{t("groups.active")}</Label>
        </div>
      )}
      <FormError error={m.error} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={m.isPending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

export function GroupDialogs({ action, onClose }: { action: GroupAction | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const [newCode, setNewCode] = useState<string | null>(null);
  const regen = useMutation({
    mutationFn: (id: string) => regenerateGroupCode(id),
    onSuccess: (g) => {
      void qc.invalidateQueries({ queryKey: GROUPS_KEY });
      onClose();
      setNewCode(g.code);
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      toast.push({ message: t("groups.deleted") });
      void qc.invalidateQueries({ queryKey: GROUPS_KEY });
      void qc.invalidateQueries({ queryKey: ["players"] });
      onClose();
    },
  });
  const kind = action?.kind;
  const group = action && action.kind !== "create" ? action.group : undefined;
  return (
    <>
      <Dialog open={kind === "create" || kind === "edit"} onClose={onClose} title={t(kind === "edit" ? "groups.editTitle" : "groups.createTitle")}>
        <GroupForm group={kind === "edit" ? group : undefined} onClose={onClose} />
      </Dialog>
      <SecretCodeDialog title={t("groups.codeTitle", { name: group?.name })} warning={t("groups.codeHint")} code={kind === "code" ? (group?.code ?? null) : newCode} onClose={() => (kind === "code" ? onClose() : setNewCode(null))} />
      <ConfirmDialog
        open={kind === "regenerate"}
        onClose={onClose}
        title={t("groups.regenerateTitle")}
        confirmLabel={t("groups.regenerateConfirm")}
        onConfirm={() => group && regen.mutate(group.id)}
        pending={regen.isPending}
        error={regen.error}
      >
        <p>{t("groups.regenerateBody")}</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={kind === "delete"}
        onClose={onClose}
        title={t("groups.deleteTitle", { name: group?.name })}
        confirmLabel={t("groups.deleteConfirm")}
        onConfirm={() => group && del.mutate(group.id)}
        pending={del.isPending}
        error={del.error}
      >
        {group && <DeletionImpactView queryKey={["groups", "impact", group.id]} fetcher={() => groupDeletionImpact(group.id)} warning={t("groups.deleteWarning")} />}
      </ConfirmDialog>
    </>
  );
}
