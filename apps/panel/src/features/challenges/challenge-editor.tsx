import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { createChallenge, getChallenge, updateChallenge } from "../../api/panel-api";
import { FormError } from "../../components/form-error";
import { FormField } from "../../components/form-field";
import { PageTitle } from "../../components/page-title";
import { ErrorState, ListSkeleton } from "../../components/query-states";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { useToasts } from "../../components/ui/toast-store";
import { ASSET_CATALOG } from "./asset-catalog";
import { buildChallenge, emptyForm, FAMILIES, fromChallenge, newRow, TEMPLATE_MAX, TEXT_MAX, WORD_MAX, type FormState, type MechanicType, type Row } from "./challenge-form";

const TYPES: readonly MechanicType[] = ["dragDrop", "numberInput", "wordDrop"];

function GroupError({ id, code }: { id: string; code?: string }) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <p id={id} className="text-sm font-medium text-danger">
      {t(`challenges.err.${code}`)}
    </p>
  );
}

function AssetSelect({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const { t } = useTranslation();
  const ids = value !== "" && !ASSET_CATALOG.includes(value) ? [...ASSET_CATALOG, value] : ASSET_CATALOG;
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t("challenges.chooseAsset")}</option>
        {ids.map((a) => (
          <option key={a} value={a}>
            {t(`assets.${a}`, { defaultValue: a })}
          </option>
        ))}
      </Select>
      <GroupError id={`${id}-error`} code={error} />
    </div>
  );
}

/** Lista de filas con dos entradas (o una) y botones para agregar y quitar. */
function RowsEditor({ id, legend, rows, onChange, labelA, labelB, error, maxLengthA, maxLengthB }: { id: string; legend: string; rows: Row[]; onChange: (r: Row[]) => void; labelA: string; labelB?: string; error?: string; maxLengthA?: number; maxLengthB?: number }) {
  const { t } = useTranslation();
  const set = (key: number, patch: Partial<Row>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="font-semibold">{legend}</legend>
      {rows.map((r, i) => (
        <div key={r.key} className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <FormField id={`${id}-${r.key}-a`} label={`${labelA} ${i + 1}`} value={r.a} maxLength={maxLengthA} onChange={(e) => set(r.key, { a: e.target.value })} />
          </div>
          {labelB !== undefined && (
            <div className="min-w-40 flex-1">
              <FormField id={`${id}-${r.key}-b`} label={`${labelB} ${i + 1}`} value={r.b} maxLength={maxLengthB} onChange={(e) => set(r.key, { b: e.target.value })} />
            </div>
          )}
          <Button variant="outline" aria-label={t("challenges.removeRow", { n: i + 1, name: labelA })} onClick={() => onChange(rows.filter((x) => x.key !== r.key))} disabled={rows.length === 1}>
            <Trash2 aria-hidden="true" className="size-5" />
          </Button>
        </div>
      ))}
      <GroupError id={`${id}-error`} code={error} />
      <div>
        <Button variant="outline" onClick={() => onChange([...rows, newRow()])}>
          <Plus aria-hidden="true" className="size-5" />
          {t("challenges.addRow")}
        </Button>
      </div>
    </fieldset>
  );
}

function Fields({ f, set, errors }: { f: FormState; set: (p: Partial<FormState>) => void; errors: Record<string, string> }) {
  const { t } = useTranslation();
  const err = (k: string) => errors[k];
  const fe = (k: string) => (err(k) ? t(`challenges.err.${err(k)}`) : null);
  if (f.type === "dragDrop")
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <AssetSelect id="dd-item" label={t("challenges.itemAsset")} value={f.ddItemAsset} onChange={(v) => set({ ddItemAsset: v })} error={err("ddItemAsset")} />
        <FormField id="dd-item-count" label={t("challenges.itemCount")} inputMode="numeric" value={f.ddItemCount} onChange={(e) => set({ ddItemCount: e.target.value })} error={fe("ddItemCount")} />
        <AssetSelect id="dd-cont" label={t("challenges.containerAsset")} value={f.ddContainerAsset} onChange={(v) => set({ ddContainerAsset: v })} error={err("ddContainerAsset")} />
        <FormField id="dd-cont-count" label={t("challenges.containerCount")} inputMode="numeric" value={f.ddContainerCount} onChange={(e) => set({ ddContainerCount: e.target.value })} error={fe("ddContainerCount")} />
        <div className="flex flex-col gap-1">
          <Label htmlFor="dd-rule">{t("challenges.rule")}</Label>
          <Select id="dd-rule" value={f.ddRule} onChange={(e) => set({ ddRule: e.target.value === "targetCounts" ? "targetCounts" : "equalShare" })}>
            <option value="equalShare">{t("challenges.ruleEqualShare")}</option>
            <option value="targetCounts">{t("challenges.ruleTargetCounts")}</option>
          </Select>
        </div>
        {f.ddRule === "targetCounts" && (
          <FormField id="dd-counts" label={t("challenges.targetCounts")} hint={t("challenges.targetCountsHint")} value={f.ddCounts} onChange={(e) => set({ ddCounts: e.target.value })} error={fe("ddCounts")} />
        )}
      </div>
    );
  if (f.type === "numberInput")
    return (
      <div className="flex flex-col gap-4">
        <FormField id="ni-expression" label={t("challenges.expression")} hint={t("challenges.holesHint")} maxLength={TEMPLATE_MAX} value={f.niExpression} onChange={(e) => set({ niExpression: e.target.value })} error={fe("niExpression")} />
        <RowsEditor id="ni-fields" legend={t("challenges.fields")} labelA={t("challenges.fieldId")} labelB={t("challenges.expected")} rows={f.niFields} onChange={(r) => set({ niFields: r })} error={err("niFields")} maxLengthA={16} />
      </div>
    );
  return (
    <div className="flex flex-col gap-4">
      <FormField id="wd-template" label={t("challenges.template")} hint={t("challenges.holesHint")} maxLength={TEMPLATE_MAX} value={f.wdTemplate} onChange={(e) => set({ wdTemplate: e.target.value })} error={fe("wdTemplate")} />
      <RowsEditor id="wd-blanks" legend={t("challenges.blanks")} labelA={t("challenges.fieldId")} labelB={t("challenges.correct")} rows={f.wdBlanks} onChange={(r) => set({ wdBlanks: r })} error={err("wdBlanks")} maxLengthA={16} maxLengthB={WORD_MAX} />
      <RowsEditor id="wd-words" legend={t("challenges.wordBank")} labelA={t("challenges.word")} rows={f.wdWords} onChange={(r) => set({ wdWords: r })} error={err("wdWords")} maxLengthA={WORD_MAX} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function EditorForm({ id, initial, onDone }: { id: string | null; initial: FormState; onDone: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const [f, setF] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const set = (p: Partial<FormState>) => setF((s) => ({ ...s, ...p }));
  const { challenge, errors } = buildChallenge(f);
  const shown = submitted ? errors : {};
  const m = useMutation({
    mutationFn: (c: NonNullable<typeof challenge>) => (id === null ? createChallenge(c) : updateChallenge(id, c)),
    onSuccess: () => {
      toast.push({ message: t(id === null ? "challenges.created" : "challenges.saved") });
      void qc.invalidateQueries({ queryKey: ["challenges"] });
      onDone();
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (challenge) m.mutate(challenge);
  };
  const toggleAsset = (a: string) => set({ assets: f.assets.includes(a) ? f.assets.filter((x) => x !== a) : [...f.assets, a] });
  const assetChoices = [...ASSET_CATALOG, ...f.assets.filter((a) => !ASSET_CATALOG.includes(a))];
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Section title={t("challenges.general")}>
        <div className="flex flex-col gap-1">
          <Label htmlFor="c-text">{t("challenges.text")}</Label>
          <Textarea id="c-text" maxLength={TEXT_MAX} value={f.text} aria-invalid={shown.text ? true : undefined} aria-describedby="c-text-hint" onChange={(e) => set({ text: e.target.value })} />
          <p id="c-text-hint" className={shown.text ? "text-sm font-medium text-danger" : "text-sm text-text-muted"}>
            {shown.text ? t(`challenges.err.${shown.text}`) : t("challenges.textHint", { max: TEXT_MAX })}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="c-difficulty" label={t("challenges.difficulty")} inputMode="numeric" value={f.difficulty} onChange={(e) => set({ difficulty: e.target.value })} error={shown.difficulty ? t(`challenges.err.${shown.difficulty}`) : null} />
          <FormField id="c-points" label={t("challenges.points")} hint={t("challenges.pointsHint")} inputMode="numeric" value={f.points} onChange={(e) => set({ points: e.target.value })} error={shown.points ? t(`challenges.err.${shown.points}`) : null} />
          <div className="flex flex-col gap-1">
            <Label htmlFor="c-family">{t("challenges.family")}</Label>
            <Select id="c-family" value={f.family} onChange={(e) => set({ family: e.target.value })}>
              <option value="">{t("challenges.noFamily")}</option>
              {FAMILIES.map((x) => (
                <option key={x} value={x}>
                  {t(`family.${x}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">{t("challenges.assets")}</legend>
          <p className="text-sm text-text-muted">{t("challenges.assetsHint")}</p>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {assetChoices.map((a) => (
              <label key={a} className="flex min-h-touch items-center gap-2">
                <input type="checkbox" className="size-5 accent-primary" checked={f.assets.includes(a)} onChange={() => toggleAsset(a)} />
                {t(`assets.${a}`, { defaultValue: a })}
              </label>
            ))}
          </div>
        </fieldset>
      </Section>
      <Section title={t("challenges.mechanic")}>
        <div className="flex flex-col gap-1">
          <Label htmlFor="c-type">{t("challenges.mechanic")}</Label>
          <Select id="c-type" value={f.type} onChange={(e) => set({ type: TYPES.find((x) => x === e.target.value) ?? f.type })}>
            {TYPES.map((x) => (
              <option key={x} value={x}>
                {t(`challenges.mechanics.${x}`)}
              </option>
            ))}
          </Select>
          <p className="text-sm text-text-muted">{t(`challenges.mechanicHelp.${f.type}`)}</p>
        </div>
        <Fields f={f} set={set} errors={shown} />
      </Section>
      {submitted && !challenge && (
        <p role="alert" className="font-medium text-danger">
          {t("challenges.fixErrors")}
        </p>
      )}
      <FormError error={m.error} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={m.isPending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

/** `id` null = desafio nuevo. */
export function ChallengeEditor({ id, onDone }: { id: string | null; onDone: () => void }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ["challenges", "one", id], queryFn: () => getChallenge(id ?? ""), enabled: id !== null, gcTime: 0 });
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t(id === null ? "challenges.newTitle" : "challenges.editTitle")}</PageTitle>
      {id !== null && q.isPending && <ListSkeleton />}
      {id !== null && q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {id === null && <EditorForm id={null} initial={emptyForm()} onDone={onDone} />}
      {q.isSuccess && <EditorForm id={q.data.id} initial={fromChallenge(q.data.challenge)} onDone={onDone} />}
    </div>
  );
}
