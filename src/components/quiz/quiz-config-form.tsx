"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  saveQuizConfig,
  type QuizActionState,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/questions/types";
import { RESULTS_MODES, RESULTS_MODE_LABELS, isoToParisLocal } from "@/lib/quiz/config";
import { availablePerRule, quizTotalPoints } from "@/lib/quiz/draw";
import type { BankQuestion, DrawRule } from "@/lib/quiz/types";

type BankSummary = Pick<BankQuestion, "id" | "category" | "type" | "tags">;

interface RuleState {
  key: number;
  category: string;
  tags: string;
  types: QuestionType[];
  count: string;
  pointsEach: string;
}

const fmt = (n: number) => String(n).replace(".", ",");
const asRule = (r: RuleState): DrawRule => ({
  category: r.category.trim() || null,
  tags: r.tags
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean),
  types: r.types,
  count: Number(r.count),
  pointsEach: Number(r.pointsEach.replace(",", ".")),
});

export function QuizConfigForm({
  moduleId,
  assessmentId,
  quiz,
  bank,
  categories,
}: {
  moduleId: string;
  assessmentId: string;
  quiz: {
    title: string;
    instructions: string;
    duration_minutes: number | null;
    opens_at: string | null;
    closes_at: string | null;
    show_results: (typeof RESULTS_MODES)[number];
    shuffle_questions: boolean;
    shuffle_choices: boolean;
    status: "draft" | "published" | "closed";
    rules: DrawRule[];
  };
  bank: BankSummary[];
  categories: string[];
}) {
  const [state, action, pending] = useActionState(
    saveQuizConfig.bind(null, moduleId, assessmentId),
    {} as QuizActionState,
  );
  const draft = quiz.status === "draft";
  const nextKey = useRef(100);
  const [rules, setRules] = useState<RuleState[]>(() =>
    quiz.rules.length
      ? quiz.rules.map((r, key) => ({
          key,
          category: r.category ?? "",
          tags: r.tags.join(", "),
          types: r.types,
          count: String(r.count),
          pointsEach: String(r.pointsEach),
        }))
      : [{ key: 0, category: "", tags: "", types: [], count: "5", pointsEach: "1" }],
  );
  const [announce, setAnnounce] = useState("");
  const parsed = useMemo(() => rules.map(asRule), [rules]);
  const available = useMemo(() => availablePerRule(bank as BankQuestion[], parsed), [bank, parsed]);
  const total = quizTotalPoints(
    parsed.filter((r) => Number.isFinite(r.count) && Number.isFinite(r.pointsEach)),
  );

  const update = (key: number, patch: Partial<RuleState>) =>
    setRules((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRule = () => {
    const key = nextKey.current++;
    setRules((rs) => [
      ...rs,
      { key, category: "", tags: "", types: [], count: "1", pointsEach: "1" },
    ]);
    setAnnounce(`Règle ${rules.length + 1} ajoutée.`);
    requestAnimationFrame(() => document.getElementById(`rule-${key}-category`)?.focus());
  };
  const removeRule = (key: number, n: number) => {
    setRules((rs) => rs.filter((r) => r.key !== key));
    setAnnounce(`Règle ${n} supprimée.`);
    requestAnimationFrame(() => document.getElementById("add-rule")?.focus());
  };

  return (
    <form action={action} className="max-w-2xl space-y-6">
      {state.errors?.length ? (
        <div
          role="alert"
          className="border-destructive text-destructive rounded-md border p-3 text-sm"
        >
          <p className="font-medium">La configuration n’est pas enregistrée :</p>
          <ul className="list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm">
          Configuration enregistrée.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="title">Titre du QCM</Label>
        <Input id="title" name="title" required defaultValue={quiz.title} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="instructions">Consignes affichées avant de commencer (Markdown)</Label>
        <Textarea id="instructions" name="instructions" rows={4} defaultValue={quiz.instructions} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Durée (minutes)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            inputMode="numeric"
            defaultValue={quiz.duration_minutes ?? ""}
            aria-describedby="duration-hint"
          />
          <p id="duration-hint" className="text-muted-foreground text-xs">
            Vide : pas de limite de temps.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opensAt">Ouverture (heure de Paris)</Label>
          <Input
            id="opensAt"
            name="opensAt"
            type="datetime-local"
            defaultValue={isoToParisLocal(quiz.opens_at)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closesAt">Fermeture (heure de Paris)</Label>
          <Input
            id="closesAt"
            name="closesAt"
            type="datetime-local"
            defaultValue={isoToParisLocal(quiz.closes_at)}
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Ce que voient les étudiant·es après avoir rendu leur copie
        </legend>
        {RESULTS_MODES.map((m) => (
          <label key={m} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="showResults"
              value={m}
              defaultChecked={quiz.show_results === m}
              className="mt-1"
            />
            {RESULTS_MODE_LABELS[m]}
          </label>
        ))}
        <p className="text-muted-foreground text-xs">
          Le corrigé n’est jamais visible avant la clôture du QCM pour tout le monde, rattrapages
          compris.
        </p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Mélange</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="shuffleQuestions" defaultChecked={quiz.shuffle_questions} />{" "}
          Mélanger l’ordre des questions
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="shuffleChoices" defaultChecked={quiz.shuffle_choices} />{" "}
          Mélanger l’ordre des choix
        </label>
      </fieldset>

      <fieldset disabled={!draft} className="space-y-4">
        <legend className="text-base font-medium">
          Tirage : les questions sont différentes pour chaque étudiant·e
        </legend>
        {!draft ? (
          <p className="text-muted-foreground text-sm">
            Les règles ne changent plus une fois le QCM publié : des tirages existent peut-être
            déjà.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Chaque règle tire N questions de ta banque, chacune à X points : le barème est le même
            pour tout le monde.
          </p>
        )}
        <ol className="space-y-4">
          {rules.map((r, i) => (
            <li key={r.key}>
              <fieldset className="space-y-3 rounded-lg border p-4">
                <legend className="px-1 text-sm font-medium">Règle {i + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`rule-${r.key}-category`}>Catégorie</Label>
                    <Input
                      id={`rule-${r.key}-category`}
                      list="quiz-categories"
                      value={r.category}
                      onChange={(e) => update(r.key, { category: e.target.value })}
                      placeholder="Toutes"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`rule-${r.key}-tags`}>Tags (tous requis)</Label>
                    <Input
                      id={`rule-${r.key}-tags`}
                      value={r.tags}
                      onChange={(e) => update(r.key, { tags: e.target.value })}
                    />
                  </div>
                </div>
                <fieldset className="space-y-1">
                  <legend className="text-sm">Types de question (aucun coché : tous)</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {QUESTION_TYPES.map((t) => (
                      <label key={t} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={r.types.includes(t)}
                          onChange={(e) =>
                            update(r.key, {
                              types: e.target.checked
                                ? [...r.types, t]
                                : r.types.filter((x) => x !== t),
                            })
                          }
                        />
                        {QUESTION_TYPE_LABELS[t]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1">
                    <Label htmlFor={`rule-${r.key}-count`}>Nombre de questions</Label>
                    <Input
                      id={`rule-${r.key}-count`}
                      inputMode="numeric"
                      className="w-24"
                      value={r.count}
                      onChange={(e) => update(r.key, { count: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`rule-${r.key}-points`}>Points par question</Label>
                    <Input
                      id={`rule-${r.key}-points`}
                      inputMode="decimal"
                      className="w-24"
                      value={r.pointsEach}
                      onChange={(e) => update(r.key, { pointsEach: e.target.value })}
                    />
                  </div>
                  <p className="text-muted-foreground pb-2 text-sm">
                    {available[i]} question{available[i] > 1 ? "s" : ""} disponible
                    {available[i] > 1 ? "s" : ""} dans la banque
                    {Number(r.count) > available[i] ? " — pas assez pour cette règle" : ""}.
                  </p>
                  {rules.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRule(r.key, i + 1)}
                    >
                      <Trash2 aria-hidden />
                      Supprimer la règle {i + 1}
                    </Button>
                  ) : null}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <datalist id="quiz-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Button id="add-rule" type="button" variant="secondary" size="sm" onClick={addRule}>
          <Plus aria-hidden />
          Ajouter une règle
        </Button>
        <p role="status" className="text-sm font-medium">
          Total : {fmt(total)} point{total > 1 ? "s" : ""} pour chaque étudiant·e.
        </p>
        <p role="status" aria-live="polite" className="sr-only">
          {announce}
        </p>
      </fieldset>
      <input
        type="hidden"
        name="rulesJson"
        value={JSON.stringify(
          rules.map(({ category, tags, types, count, pointsEach }) => ({
            category,
            tags: tags
              .split(/[,;]/)
              .map((t) => t.trim())
              .filter(Boolean),
            types,
            count,
            pointsEach,
          })),
        )}
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le QCM"}
      </Button>
    </form>
  );
}
