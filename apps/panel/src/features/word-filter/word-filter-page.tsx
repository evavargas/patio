import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { PanelBannedWords } from "@patio/contracts";
import { getBannedWords, putBannedWords } from "../../api/panel-api";
import { FormError } from "../../components/form-error";
import { FormField } from "../../components/form-field";
import { PageTitle } from "../../components/page-title";
import { EmptyState, ErrorState, ListSkeleton, useErrorText } from "../../components/query-states";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useToasts } from "../../components/ui/toast-store";

const WORD_MAX = 40; // UpdateBannedWordsRequest.words[]

export function WordFilterPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToasts();
  const errorText = useErrorText();
  const [word, setWord] = useState("");
  const [bad, setBad] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["banned-words"], queryFn: getBannedWords, gcTime: 0 });
  const save = useMutation({ mutationFn: (words: string[]) => putBannedWords({ words }) });
  const apply = (words: string[], message: string, undoTo?: string[]) =>
    save.mutate(words, {
      onSuccess: (saved: PanelBannedWords) => {
        qc.setQueryData(["banned-words"], saved);
        // Quitar una palabra se puede revertir reponiendo la lista anterior (sube la version otra vez).
        toast.push({ message, ...(undoTo ? { action: { label: t("wordFilter.undo"), run: () => apply(undoTo, t("wordFilter.undone")) } } : {}) });
      },
      onError: (e) => toast.push({ message: errorText(e) }),
    });

  const add = (e: FormEvent) => {
    e.preventDefault();
    const w = word.trim();
    const words = q.data?.words ?? [];
    if (w === "" || w.length > WORD_MAX) return setBad(t("wordFilter.bad", { max: WORD_MAX }));
    if (words.some((x) => x.toLowerCase() === w.toLowerCase())) return setBad(t("wordFilter.duplicate"));
    setBad(null);
    setWord("");
    apply([...words, w], t("wordFilter.added", { word: w }));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t("nav.wordFilter")}</PageTitle>
      <p className="text-text-muted">
        {t("wordFilter.help")} <Link className="font-semibold underline" to="/players">{t("wordFilter.goPlayers")}</Link>
      </p>
      {q.isPending && <ListSkeleton />}
      {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
      {q.isSuccess && (
        <>
          <form onSubmit={add} noValidate className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <FormField id="bw-word" label={t("wordFilter.word")} maxLength={WORD_MAX} value={word} onChange={(e) => setWord(e.target.value)} error={bad} />
            </div>
            <Button type="submit" disabled={save.isPending}>
              <Plus aria-hidden="true" className="size-5" />
              {t("wordFilter.add")}
            </Button>
          </form>
          <FormError error={save.error} />
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t("wordFilter.listTitle", { count: q.data.words.length })}</h2>
            <p className="text-sm text-text-muted">{t("wordFilter.version", { version: q.data.version })}</p>
            {q.data.words.length === 0 ? (
              <EmptyState text={t("wordFilter.empty")} />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {q.data.words.map((w) => (
                  <li key={w} className="flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1">
                    {w}
                    <Button variant="ghost" className="min-h-touch px-2" aria-label={t("wordFilter.remove", { word: w })} disabled={save.isPending} onClick={() => apply(q.data.words.filter((x) => x !== w), t("wordFilter.removed", { word: w }), q.data.words)}>
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
