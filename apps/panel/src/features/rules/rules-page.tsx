import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { PanelLimits, PanelRules } from "@patio/contracts";
import { getLimits, getRules, putLimits, putRules } from "../../api/panel-api";
import { useSession } from "../../auth/session-store";
import { FormError } from "../../components/form-error";
import { FormField } from "../../components/form-field";
import { PageTitle } from "../../components/page-title";
import { ErrorState, ListSkeleton } from "../../components/query-states";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { useToasts } from "../../components/ui/toast-store";
import { buildLimits, buildRules, LIMIT_KEYS, limitsToForm, nextKey, rulesToForm, type LimitsForm, type RulesForm } from "./rules-form";

const FAMILIES = ["resolver", "descubrir", "crear"] as const;

function RulesFormView({ rules, canEdit }: { rules: PanelRules; canEdit: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const [f, setF] = useState<RulesForm>(() => rulesToForm(rules));
  const [problem, setProblem] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (body: PanelRules) => putRules(body),
    onSuccess: (saved) => {
      toast.push({ message: t("rules.saved") });
      qc.setQueryData(["rules"], saved);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = buildRules(f);
    setProblem("error" in r ? r.error : null);
    if ("body" in r) m.mutate(r.body);
  };
  const setPoint = (key: number, patch: Partial<RulesForm["points"][number]>) => setF({ ...f, points: f.points.map((p) => (p.key === key ? { ...p, ...patch } : p)) });
  const setLevel = (key: number, fn: (l: RulesForm["levels"][number]) => RulesForm["levels"][number]) => setF({ ...f, levels: f.levels.map((l) => (l.key === key ? fn(l) : l)) });
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <fieldset disabled={!canEdit} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("rules.pointsTitle")}</h2>
          <p className="text-sm text-text-muted">{t("rules.pointsHint")}</p>
          {f.points.map((p, i) => (
            <div key={p.key} className="flex flex-wrap items-end gap-2">
              <FormField id={`pt-d-${p.key}`} label={`${t("rules.difficulty")} ${i + 1}`} inputMode="numeric" value={p.difficulty} onChange={(e) => setPoint(p.key, { difficulty: e.target.value })} />
              <FormField id={`pt-p-${p.key}`} label={`${t("rules.points")} ${i + 1}`} inputMode="numeric" value={p.points} onChange={(e) => setPoint(p.key, { points: e.target.value })} />
              {canEdit && (
                <Button variant="outline" aria-label={t("rules.removePoints", { n: i + 1 })} onClick={() => setF({ ...f, points: f.points.filter((x) => x.key !== p.key) })}>
                  <Trash2 aria-hidden="true" className="size-5" />
                </Button>
              )}
            </div>
          ))}
          {canEdit && (
            <div>
              <Button variant="outline" onClick={() => setF({ ...f, points: [...f.points, { key: nextKey(), difficulty: "", points: "" }] })}>
                <Plus aria-hidden="true" className="size-5" />
                {t("rules.addPoints")}
              </Button>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{t("rules.levelsTitle")}</h2>
          <p className="text-sm text-text-muted">{t("rules.levelsHint")}</p>
          {f.levels.length === 0 && <p className="text-text-muted">{t("rules.levelsEmpty")}</p>}
          {f.levels.map((l, li) => (
            <fieldset key={l.key} className="flex flex-col gap-3 rounded-lg border-2 border-border p-3">
              <legend className="px-1 font-semibold">{t("rules.levelFrom", { from: li, to: li + 1 })}</legend>
              <FormField id={`lv-s-${l.key}`} label={t("rules.minScore")} hint={t("rules.minScoreHint")} inputMode="numeric" value={l.minScore} onChange={(e) => setLevel(l.key, (x) => ({ ...x, minScore: e.target.value }))} />
              {l.reqs.map((q, qi) => (
                <div key={q.key} className="flex flex-wrap items-end gap-2">
                  <FormField id={`rq-d-${q.key}`} label={`${t("rules.difficulty")} (${qi + 1})`} inputMode="numeric" value={q.difficulty} onChange={(e) => setLevel(l.key, (x) => ({ ...x, reqs: x.reqs.map((r) => (r.key === q.key ? { ...r, difficulty: e.target.value } : r)) }))} />
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`rq-f-${q.key}`}>{`${t("challenges.family")} (${qi + 1})`}</Label>
                    <Select id={`rq-f-${q.key}`} value={q.family} onChange={(e) => setLevel(l.key, (x) => ({ ...x, reqs: x.reqs.map((r) => (r.key === q.key ? { ...r, family: e.target.value } : r)) }))}>
                      <option value="">{t("rules.anyFamily")}</option>
                      {FAMILIES.map((x) => (
                        <option key={x} value={x}>
                          {t(`family.${x}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <FormField id={`rq-m-${q.key}`} label={`${t("rules.minCount")} (${qi + 1})`} inputMode="numeric" value={q.min} onChange={(e) => setLevel(l.key, (x) => ({ ...x, reqs: x.reqs.map((r) => (r.key === q.key ? { ...r, min: e.target.value } : r)) }))} />
                  {canEdit && (
                    <Button variant="outline" aria-label={t("rules.removeReq", { n: qi + 1, level: li })} onClick={() => setLevel(l.key, (x) => ({ ...x, reqs: x.reqs.filter((r) => r.key !== q.key) }))}>
                      <Trash2 aria-hidden="true" className="size-5" />
                    </Button>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setLevel(l.key, (x) => ({ ...x, reqs: [...x.reqs, { key: nextKey(), difficulty: "", family: "", min: "" }] }))}>
                    <Plus aria-hidden="true" className="size-5" />
                    {t("rules.addReq")}
                  </Button>
                  <Button variant="outline" onClick={() => setF({ ...f, levels: f.levels.filter((x) => x.key !== l.key) })}>
                    <Trash2 aria-hidden="true" className="size-5" />
                    {t("rules.removeLevel", { from: li, to: li + 1 })}
                  </Button>
                </div>
              )}
            </fieldset>
          ))}
          {canEdit && (
            <div>
              <Button variant="outline" onClick={() => setF({ ...f, levels: [...f.levels, { key: nextKey(), minScore: "", reqs: [] }] })}>
                <Plus aria-hidden="true" className="size-5" />
                {t("rules.addLevel")}
              </Button>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{t("rules.timeTitle")}</h2>
          <FormField id="r-tol" label={t("rules.tolerance")} hint={t("rules.toleranceHint")} inputMode="numeric" value={f.tolerance} onChange={(e) => setF({ ...f, tolerance: e.target.value })} />
          <p className="text-sm text-text-muted">{t("rules.timezoneNote")}</p>
        </Card>
      </fieldset>
      {problem && (
        <p role="alert" className="font-medium text-danger">
          {t(`rules.err.${problem}`)}
        </p>
      )}
      <FormError error={m.error} />
      {canEdit && (
        <div>
          <Button type="submit" disabled={m.isPending}>
            {t("common.save")}
          </Button>
        </div>
      )}
    </form>
  );
}

function LimitsCard({ limits }: { limits: PanelLimits }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const [f, setF] = useState<LimitsForm>(() => limitsToForm(limits));
  const [bad, setBad] = useState(false);
  const m = useMutation({
    mutationFn: (body: PanelLimits) => putLimits(body),
    onSuccess: (saved) => {
      toast.push({ message: t("rules.limitsSaved") });
      qc.setQueryData(["limits"], saved);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = buildLimits(f);
    setBad(body === null);
    if (body) m.mutate(body);
  };
  return (
    <form onSubmit={submit} noValidate>
      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("rules.limitsTitle")}</h2>
        <p className="text-sm text-text-muted">{t("rules.limitsHint")}</p>
        {LIMIT_KEYS.map((key) => (
          <fieldset key={key} className="flex flex-wrap items-end gap-3">
            <legend className="mb-1 font-semibold">{t(`rules.limit.${key}`)}</legend>
            <FormField id={`lim-${key}-max`} label={t("rules.limitMax")} inputMode="numeric" value={f[key].max} onChange={(e) => setF({ ...f, [key]: { ...f[key], max: e.target.value } })} />
            <FormField id={`lim-${key}-win`} label={t("rules.limitWindow")} inputMode="numeric" value={f[key].windowSeconds} onChange={(e) => setF({ ...f, [key]: { ...f[key], windowSeconds: e.target.value } })} />
          </fieldset>
        ))}
        {bad && (
          <p role="alert" className="font-medium text-danger">
            {t("rules.err.limits")}
          </p>
        )}
        <FormError error={m.error} />
        <div>
          <Button type="submit" disabled={m.isPending}>
            {t("rules.saveLimits")}
          </Button>
        </div>
      </Card>
    </form>
  );
}

export function RulesPage() {
  const { t } = useTranslation();
  const isAdmin = useSession((s) => s.account?.role === "administrator");
  const rules = useQuery({ queryKey: ["rules"], queryFn: getRules, gcTime: 0 });
  const limits = useQuery({ queryKey: ["limits"], queryFn: getLimits, enabled: isAdmin, gcTime: 0 });
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t("nav.rules")}</PageTitle>
      {!isAdmin && <p className="rounded-lg bg-info-soft p-3 font-medium">{t("rules.readOnly")}</p>}
      {rules.isPending && <ListSkeleton />}
      {rules.isError && <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />}
      {rules.isSuccess && <RulesFormView rules={rules.data} canEdit={isAdmin} />}
      {isAdmin && limits.isPending && <ListSkeleton rows={2} />}
      {isAdmin && limits.isError && <ErrorState error={limits.error} onRetry={() => void limits.refetch()} />}
      {isAdmin && limits.isSuccess && <LimitsCard limits={limits.data} />}
    </div>
  );
}
