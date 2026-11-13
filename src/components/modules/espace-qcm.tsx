"use client";

import { useState } from "react";

import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import type { EspaceQcmGroup, EspaceQcmQuestion } from "@/lib/modules/espace";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Une réponse est juste si elle coïncide avec la correction (ensemble exact, ou valeur à la tolérance près). */
export function isAnswerCorrect(
  q: EspaceQcmQuestion,
  picked: ReadonlySet<number>,
  typed: string,
): boolean {
  if (q.type === "numerical") {
    const n = Number(typed.replace(",", "."));
    return (
      q.numeric !== null &&
      typed.trim() !== "" &&
      Math.abs(n - q.numeric.value) <= q.numeric.tolerance
    );
  }
  const correct = new Set(q.choices.flatMap((c, i) => (c.correct ? [i] : [])));
  return correct.size === picked.size && [...correct].every((i) => picked.has(i));
}

function Question({ q, index }: { q: EspaceQcmQuestion; index: number }) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const multiple = q.type === "multiple_choice";
  const ok = checked && isAnswerCorrect(q, picked, typed);

  function toggle(i: number) {
    setChecked(false);
    setPicked((prev) => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(i) && multiple) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold">Question {index + 1}</legend>
      <Markdown source={q.statement} headingLevel={4} />
      <p className="text-muted-foreground text-sm">
        {q.type === "numerical"
          ? "Réponse numérique"
          : multiple
            ? "Plusieurs réponses possibles"
            : q.type === "true_false"
              ? "Vrai ou faux"
              : "Une seule réponse"}
      </p>
      {q.type === "numerical" ? (
        <div className="space-y-1">
          <label htmlFor={`num-${index}`} className="text-sm font-medium">
            Ta réponse
          </label>
          <input
            id={`num-${index}`}
            inputMode="decimal"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setChecked(false);
            }}
            className="bg-background min-h-11 w-40 rounded-lg border px-3"
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {q.choices.map((c, i) => {
            const showMark = checked && picked.has(i);
            return (
              <li key={i}>
                <label className="has-[:checked]:border-primary has-[:focus-visible]:ring-ring flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:focus-visible]:ring-2">
                  <input
                    type={multiple ? "checkbox" : "radio"}
                    name={`q-${index}`}
                    checked={picked.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-1 size-4"
                  />
                  <span>
                    <strong>{letters[i] ?? i + 1}.</strong> {c.text}
                    {checked && c.correct ? (
                      <span className="text-mint ml-2 text-sm font-semibold">
                        ✓ <span className="sr-only">bonne réponse</span>
                      </span>
                    ) : null}
                    {showMark && !c.correct ? (
                      <span className="text-destructive ml-2 text-sm font-semibold">
                        ✗ <span className="sr-only">mauvaise réponse</span>
                      </span>
                    ) : null}
                    {checked && c.feedback && (c.correct || picked.has(i)) ? (
                      <span className="text-muted-foreground block text-sm">{c.feedback}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <Button
        type="button"
        variant="secondary"
        onClick={() => setChecked(true)}
        disabled={q.type === "numerical" ? typed.trim() === "" : picked.size === 0}
      >
        Vérifier ma réponse
      </Button>
      <div role="status" aria-live="polite">
        {checked ? (
          <div className="space-y-1 text-sm">
            <p className={ok ? "text-mint font-semibold" : "text-destructive font-semibold"}>
              {ok ? "Bonne réponse." : "Ce n’est pas tout à fait ça."}
            </p>
            {q.type === "numerical" && q.numeric ? (
              <p>
                Réponse attendue : {q.numeric.value}
                {q.numeric.tolerance ? ` (à ± ${q.numeric.tolerance} près)` : ""}
              </p>
            ) : null}
            {q.feedback ? <p className="text-muted-foreground">{q.feedback}</p> : null}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

/** Mini-QCM de la séance à refaire : on répond, on vérifie, on voit la correction. Rien n'est envoyé. */
export function EspaceQcm({ groups }: { groups: EspaceQcmGroup[] }) {
  return (
    <section aria-labelledby="mini-qcm" className="mt-12 space-y-6 border-t pt-8">
      <div>
        <h2 id="mini-qcm" className="text-sm font-semibold">
          Mini-QCM de la séance
        </h2>
        <p className="text-muted-foreground text-sm">
          Les questions posées en classe, à refaire quand tu veux. Tes réponses ne sont pas
          enregistrées.
        </p>
      </div>
      {groups.map((g, gi) => (
        <div key={gi} className="space-y-3">
          <h3 className="text-sm font-semibold">{g.title}</h3>
          {g.questions.map((q, qi) => (
            <Question key={qi} q={q} index={qi} />
          ))}
        </div>
      ))}
    </section>
  );
}
