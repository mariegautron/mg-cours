"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { generateQuiz } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/generate/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { availableQuestions, pickQuestions, toggleQuestion } from "@/lib/quiz/generate";

export interface GeneratorResource {
  id: string;
  title: string;
  questionIds: string[];
}
export interface GeneratorQuestion {
  id: string;
  name: string;
  statement: string;
}

/** Générer un QCM : ressources → nombre → au hasard ou à la main → liste modifiable → création. */
export function QuizGenerator({
  moduleId,
  assessmentId,
  resources,
  questions,
}: {
  moduleId: string;
  assessmentId: string;
  resources: GeneratorResource[];
  questions: GeneratorQuestion[];
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>([]);
  const [way, setWay] = useState<"random" | "manual">("random");
  const [count, setCount] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();
  const byResource = new Map(resources.map((r) => [r.id, r.questionIds]));
  const nameOf = new Map(questions.map((q) => [q.id, q]));
  const available = availableQuestions(byResource, chosen);

  function draw() {
    const res = pickQuestions({
      byResource: new Map(chosen.map((r) => [r, byResource.get(r) ?? []])),
      count,
      seed: crypto.randomUUID(),
    });
    setSelected(res.picked);
    setNote(
      res.missing
        ? `Seulement ${res.picked.length} question${res.picked.length > 1 ? "s" : ""} disponible${res.picked.length > 1 ? "s" : ""} : il en manque ${res.missing}.`
        : `${res.picked.length} questions tirées.`,
    );
  }

  function create() {
    start(async () => {
      const res = await generateQuiz(moduleId, assessmentId, selected);
      if (res.error) setError(res.error);
      else router.push(`/modules/${moduleId}/assessments/${assessmentId}/quiz`);
    });
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="font-medium">1. Les ressources</legend>
        <ul className="space-y-1">
          {resources.map((r) => (
            <li key={r.id}>
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={chosen.includes(r.id)}
                  onChange={() => {
                    setChosen((c) => toggleQuestion(c, r.id));
                    setSelected([]);
                  }}
                />
                {r.title}{" "}
                <span className="text-muted-foreground">
                  ({r.questionIds.length} question{r.questionIds.length > 1 ? "s" : ""})
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium">2. Comment choisir les questions ?</legend>
        {(
          [
            ["random", "Au hasard"],
            ["manual", "À la main"],
          ] as const
        ).map(([v, label]) => (
          <label key={v} className="flex min-h-9 items-center gap-2 text-sm">
            <input type="radio" name="way" checked={way === v} onChange={() => setWay(v)} />
            {label}
          </label>
        ))}
      </fieldset>

      {way === "random" ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="count">Nombre de questions</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
              className="w-24"
            />
          </div>
          <Button type="button" variant="secondary" disabled={chosen.length === 0} onClick={draw}>
            {selected.length ? "Tirer à nouveau" : "Tirer au sort"}
          </Button>
        </div>
      ) : (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">
            Questions des ressources choisies ({available.length})
          </legend>
          <ul className="max-h-72 space-y-1 overflow-auto rounded-md border p-2">
            {available.map((id) => (
              <li key={id}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(id)}
                    onChange={() => setSelected((s) => toggleQuestion(s, id))}
                  />
                  <span>
                    {nameOf.get(id)?.name}
                    <span className="text-muted-foreground block text-xs">
                      {nameOf.get(id)?.statement}
                    </span>
                  </span>
                </label>
              </li>
            ))}
            {available.length === 0 ? (
              <li className="text-muted-foreground text-sm">Choisis d’abord une ressource.</li>
            ) : null}
          </ul>
        </fieldset>
      )}

      <section aria-labelledby="picked" className="space-y-2">
        <h2 id="picked" className="font-medium">
          3. Le QCM ({selected.length} question{selected.length > 1 ? "s" : ""})
        </h2>
        <p role="status" aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
          {note}
        </p>
        {selected.length > 0 ? (
          <ol className="space-y-1">
            {selected.map((id, i) => (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <span>
                  {i + 1}. {nameOf.get(id)?.name}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Retirer la question ${nameOf.get(id)?.name}`}
                  onClick={() => setSelected((s) => s.filter((x) => x !== id))}
                >
                  Retirer
                </Button>
              </li>
            ))}
          </ol>
        ) : null}
        <Button
          type="button"
          disabled={pending || selected.length === 0}
          aria-busy={pending}
          onClick={create}
        >
          {pending ? "Création…" : "Créer le QCM"}
        </Button>
        {error ? <ActionError error={error} /> : null}
      </section>
    </div>
  );
}
