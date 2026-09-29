"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { saveQuestion, type QuestionFormState } from "@/app/(app)/questions/actions";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type QuestionInput,
  type QuestionType,
} from "@/lib/questions/types";
import { keepFormValues } from "@/lib/use-kept-form";

interface ChoiceState {
  key: number;
  text: string;
  correct: boolean;
  /** Fraction en % (vide : répartie entre les bonnes réponses). */
  percent: string;
  feedback: string;
}

const SELECT_CLASS = "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function QuestionForm({
  id,
  initial,
  categories,
}: {
  id: string | null;
  initial?: QuestionInput;
  categories: string[];
}) {
  const [state, action, pending] = useActionState(
    saveQuestion.bind(null, id),
    {} as QuestionFormState,
  );
  const [type, setType] = useState<QuestionType>(initial?.type ?? "single_choice");
  const nextKey = useRef(100);
  const [choices, setChoices] = useState<ChoiceState[]>(() =>
    initial?.choices.length
      ? initial.choices.map((c, i) => ({
          key: i,
          text: c.text,
          correct: c.fraction > 0,
          percent:
            initial.type === "multiple_choice" &&
            (c.fraction < 0 ||
              (c.fraction > 0 &&
                c.fraction !== 1 / initial.choices.filter((x) => x.fraction > 0).length))
              ? String(Math.round(c.fraction * 10000) / 100)
              : "",
          feedback: c.feedback,
        }))
      : [0, 1].map((key) => ({ key, text: "", correct: key === 0, percent: "", feedback: "" })),
  );
  const [announce, setAnnounce] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  const hasChoices = type === "single_choice" || type === "multiple_choice";
  const update = (key: number, patch: Partial<ChoiceState>) =>
    setChoices((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const setSingleCorrect = (key: number) =>
    setChoices((cs) => cs.map((c) => ({ ...c, correct: c.key === key })));

  const addChoice = () => {
    const key = nextKey.current++;
    setChoices((cs) => [...cs, { key, text: "", correct: false, percent: "", feedback: "" }]);
    setAnnounce(`Choix ${choices.length + 1} ajouté.`);
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLTextAreaElement>(`[data-choice="${key}"]`)?.focus(),
    );
  };
  const removeChoice = (key: number, position: number) => {
    setChoices((cs) => cs.filter((c) => c.key !== key));
    setAnnounce(`Choix ${position} supprimé.`);
    requestAnimationFrame(() => document.getElementById("add-choice")?.focus());
  };

  // Vrai / faux : la case « Vrai » dit si l'affirmation est vraie.
  const [trueIsCorrect, setTrueIsCorrect] = useState(
    initial?.type === "true_false" ? (initial.choices[0]?.fraction ?? 0) > 0 : true,
  );
  const payload =
    type === "true_false"
      ? [{ text: "Vrai", correct: trueIsCorrect, percent: "", feedback: "" }]
      : hasChoices
        ? choices.map(({ text, correct, percent, feedback }) => ({
            text,
            correct,
            percent,
            feedback,
          }))
        : [];

  return (
    <form onSubmit={keepFormValues(action)} className="max-w-2xl space-y-6">
      {state.errors?.length ? (
        <div
          role="alert"
          className="border-destructive text-destructive rounded-md border p-3 text-sm"
        >
          <p className="font-medium">La question n’est pas enregistrée :</p>
          <ul className="list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nom court</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="SCRUM03_Roles"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type de question</Label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className={SELECT_CLASS}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Input
            id="category"
            name="category"
            list="categories"
            defaultValue={initial?.category ?? ""}
            placeholder="Scrum"
          />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultPoints">Points par défaut</Label>
          <Input
            id="defaultPoints"
            name="defaultPoints"
            inputMode="decimal"
            defaultValue={String(initial?.defaultPoints ?? 1)}
            className="w-28"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <p id="tags-hint" className="text-muted-foreground text-sm">
          Sépare-les par des virgules (ex. agile, rôles).
        </p>
        <Input
          id="tags"
          name="tags"
          aria-describedby="tags-hint"
          defaultValue={initial?.tags.join(", ") ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="statement">Énoncé (Markdown)</Label>
        <Textarea
          id="statement"
          name="statement"
          rows={5}
          required
          defaultValue={initial?.statement ?? ""}
        />
      </div>

      {type === "true_false" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">L’affirmation est…</legend>
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tf"
                checked={trueIsCorrect}
                onChange={() => setTrueIsCorrect(true)}
              />{" "}
              Vraie
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tf"
                checked={!trueIsCorrect}
                onChange={() => setTrueIsCorrect(false)}
              />{" "}
              Fausse
            </label>
          </div>
        </fieldset>
      ) : null}

      {type === "numerical" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="numericValue">Valeur attendue</Label>
            <Input
              id="numericValue"
              name="numericValue"
              inputMode="decimal"
              defaultValue={initial?.numericValue ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numericTolerance">Tolérance (± )</Label>
            <Input
              id="numericTolerance"
              name="numericTolerance"
              inputMode="decimal"
              defaultValue={initial?.numericTolerance ?? ""}
            />
          </div>
        </div>
      ) : null}

      {hasChoices ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">
            Choix —{" "}
            {type === "single_choice"
              ? "une seule bonne réponse"
              : "une ou plusieurs bonnes réponses"}
          </legend>
          <ol ref={listRef} className="space-y-4">
            {choices.map((c, i) => (
              <li key={c.key} className="space-y-2 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`choice-${c.key}`}>Choix {i + 1}</Label>
                    <Textarea
                      id={`choice-${c.key}`}
                      data-choice={c.key}
                      rows={2}
                      value={c.text}
                      onChange={(e) => update(c.key, { text: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeChoice(c.key, i + 1)}
                    disabled={choices.length <= 2}
                  >
                    <Trash2 aria-hidden />
                    <span className="sr-only">Supprimer le choix {i + 1}</span>
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type={type === "single_choice" ? "radio" : "checkbox"}
                    name="correct-choice"
                    checked={c.correct}
                    onChange={(e) =>
                      type === "single_choice"
                        ? setSingleCorrect(c.key)
                        : update(c.key, { correct: e.target.checked })
                    }
                  />
                  Bonne réponse
                </label>
                {type === "multiple_choice" ? (
                  <div className="space-y-1">
                    <Label htmlFor={`percent-${c.key}`}>Part des points (%), facultatif</Label>
                    <Input
                      id={`percent-${c.key}`}
                      inputMode="decimal"
                      className="w-28"
                      value={c.percent}
                      onChange={(e) => update(c.key, { percent: e.target.value })}
                      aria-describedby="percent-hint"
                    />
                  </div>
                ) : null}
                <div className="space-y-1">
                  <Label htmlFor={`fb-${c.key}`}>Retour sur ce choix, facultatif</Label>
                  <Input
                    id={`fb-${c.key}`}
                    value={c.feedback}
                    onChange={(e) => update(c.key, { feedback: e.target.value })}
                  />
                </div>
              </li>
            ))}
          </ol>
          {type === "multiple_choice" ? (
            <p id="percent-hint" className="text-muted-foreground text-sm">
              Laisse la part vide pour répartir les points également entre les bonnes réponses ; un
              pourcentage négatif pénalise un choix faux.
            </p>
          ) : null}
          <Button id="add-choice" type="button" variant="secondary" size="sm" onClick={addChoice}>
            <Plus aria-hidden />
            Ajouter un choix
          </Button>
          <p role="status" aria-live="polite" className="sr-only">
            {announce}
          </p>
        </fieldset>
      ) : null}

      <input type="hidden" name="choicesJson" value={JSON.stringify(payload)} />

      <div className="space-y-2">
        <Label htmlFor="generalFeedback">Corrigé / retour général (Markdown, facultatif)</Label>
        <Textarea
          id="generalFeedback"
          name="generalFeedback"
          rows={3}
          defaultValue={initial?.generalFeedback ?? ""}
        />
      </div>

      <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
        Enregistrer la question
      </PendingButton>
    </form>
  );
}
