"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  reopenCopy,
  saveReviewField,
  setQuestionCriteria,
  validateAnswer,
  setCopyAttendance,
  writeReviews,
  type WriteResult,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/correct/open-actions";
import { useVersionedFields, type FieldSaver } from "@/components/assessments/use-oral-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ANSWER_STATE_LABELS,
  answerState,
  copyProgress,
  planCopyWrite,
  prefillPoints,
  suggestedCriterionLetter,
  type AnswerEntry,
} from "@/lib/assessments/open-review";
import { isLetter, LETTERS, levelFor, type OralCriterion } from "@/lib/assessments/oral-space";
import { cn } from "@/lib/utils";

export interface ReviewQuestion {
  position: number;
  questionId: string;
  statement: string;
  points: number;
  /** L'attendu : visible par Marie seulement, jamais envoyé aux étudiant·es. */
  expected: string;
}

export interface ReviewCopy {
  id: string;
  name: string;
  /** Personne de la copie (pour poser une absence sur une copie non rendue). */
  studentId?: string;
  /** Présence enregistrée sur la note (« present » par défaut). */
  attendance?: string | null;
  submitted: boolean;
  locked: boolean;
  legacy: boolean;
  writtenAt: string | null;
  drawn: ReviewQuestion[];
  answers: Record<string, string>;
  entries: Record<string, AnswerEntry>;
  globalComment: string;
  criterionLetters: Record<string, string>;
  versions: Record<string, number>;
}

type View = "overview" | "question" | "student";

const VIEW_LABELS: Record<View, string> = {
  overview: "Vue d’ensemble",
  question: "Par question",
  student: "Par étudiant·e",
};

const titleOf = (statement: string) => {
  const line =
    statement
      .replace(/[#*_>`]/g, "")
      .trim()
      .split("\n")[0] ?? "";
  return line.length > 70 ? `${line.slice(0, 70)}…` : line;
};
const fmt = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

/**
 * Relecture des questions ouvertes tirées au sort : trois vues, validation réponse par réponse,
 * puis écriture dans l'évaluation. Correction à la main, sans aucune analyse automatique.
 */
export function OpenReview({
  moduleId,
  assessmentId,
  maxScore,
  criteria,
  initialLinks,
  copies,
}: {
  moduleId: string;
  assessmentId: string;
  maxScore: number;
  criteria: OralCriterion[];
  initialLinks: Record<string, string[]>;
  copies: ReviewCopy[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const [copyId, setCopyId] = useState(copies.find((c) => c.submitted)?.id ?? copies[0]?.id ?? "");
  const [questionId, setQuestionId] = useState("");
  const [links, setLinks] = useState(initialLinks);
  const [showLinks, setShowLinks] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const initial = useMemo(() => {
    const values: Record<string, string> = {};
    const versions: Record<string, number> = {};
    for (const c of copies) {
      values[`${c.id}|global`] = c.globalComment;
      for (const crit of criteria)
        values[`${c.id}|crit:${crit.id}`] = c.criterionLetters[crit.id] ?? "";
      for (const q of c.drawn) {
        const e = c.entries[String(q.position)];
        values[`${c.id}|q:${q.position}:letter`] = e?.letter ?? "";
        values[`${c.id}|q:${q.position}:points`] = e?.points == null ? "" : String(e.points);
        values[`${c.id}|q:${q.position}:comment`] = e?.comment ?? "";
      }
      for (const [k, v] of Object.entries(c.versions)) versions[`${c.id}|${k}`] = v;
    }
    return { values, versions };
    // L'état de départ ne sert qu'au premier rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback<FieldSaver>(
    (field, value, baseVersion, force) => {
      const at = field.indexOf("|");
      return saveReviewField(
        moduleId,
        assessmentId,
        field.slice(0, at),
        field.slice(at + 1),
        value,
        baseVersion,
        force,
      );
    },
    [moduleId, assessmentId],
  );
  const f = useVersionedFields(save, initial);

  // Ce qui a été validé (vue du navigateur) : repris du serveur, mis à jour à chaque validation.
  const [validated, setValidated] = useState<Record<string, AnswerEntry["validated"]>>(() => {
    const out: Record<string, AnswerEntry["validated"]> = {};
    for (const c of copies)
      for (const [pos, e] of Object.entries(c.entries)) out[`${c.id}|${pos}`] = e.validated;
    return out;
  });
  const [lockedIds, setLockedIds] = useState<Set<string>>(
    () => new Set(copies.filter((c) => c.locked).map((c) => c.id)),
  );

  const val = (key: string) => f.values[key] ?? "";
  const entryOf = (c: ReviewCopy, pos: number): AnswerEntry => {
    const p = val(`${c.id}|q:${pos}:points`);
    const snap = validated[`${c.id}|${pos}`] ?? null;
    return {
      letter: val(`${c.id}|q:${pos}:letter`),
      points: p.trim() === "" ? null : Number(p.replace(",", ".")),
      comment: val(`${c.id}|q:${pos}:comment`),
      validated_at: snap ? "x" : null,
      validated: snap,
    };
  };
  const entriesOf = (c: ReviewCopy) =>
    Object.fromEntries(c.drawn.map((q) => [String(q.position), entryOf(c, q.position)]));
  const liteOf = (c: ReviewCopy) =>
    c.drawn.map((q) => ({ position: q.position, questionId: q.questionId, points: q.points }));
  const lettersOf = (c: ReviewCopy) =>
    Object.fromEntries(criteria.map((k) => [k.id, val(`${c.id}|crit:${k.id}`)]));
  const criteriaFor = (q: ReviewQuestion) =>
    criteria.filter((k) => (links[q.questionId] ?? []).includes(k.id));

  const submitted = copies.filter((c) => c.submitted);
  const totals = submitted.reduce(
    (acc, c) => {
      const p = copyProgress(liteOf(c), entriesOf(c));
      return { v: acc.v + p.validated, t: acc.t + p.total };
    },
    { v: 0, t: 0 },
  );

  async function validate(c: ReviewCopy, pos: number) {
    await f.flush();
    const res = await validateAnswer(moduleId, assessmentId, c.id, pos);
    if (res.error) {
      setMessage(res.error);
      return;
    }
    setMessage("");
    setValidated((prev) => ({
      ...prev,
      [`${c.id}|${pos}`]: {
        letter: val(`${c.id}|q:${pos}:letter`),
        points: Number(val(`${c.id}|q:${pos}:points`).replace(",", ".")),
        comment: val(`${c.id}|q:${pos}:comment`),
      },
    }));
  }

  function chooseLetter(c: ReviewCopy, q: ReviewQuestion, letter: string) {
    const key = `${c.id}|q:${q.position}`;
    const same = val(`${key}:letter`) === letter;
    f.set(`${key}:letter`, same ? "" : letter, true);
    if (!same) {
      const pre = prefillPoints(letter, q.points, criteriaFor(q));
      if (pre !== null) f.set(`${key}:points`, String(pre), true);
    }
  }

  function focusNextAnswer(from: HTMLElement) {
    const cards = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>("[data-answer-card]") ?? [],
    );
    const at = cards.findIndex((el) => el.contains(from));
    cards[at + 1]?.querySelector<HTMLElement>("button")?.focus();
  }

  function onCardKey(e: React.KeyboardEvent, c: ReviewCopy, q: ReviewQuestion) {
    const locked = lockedIds.has(c.id);
    const target = e.target as HTMLElement;
    const inField = target.tagName === "TEXTAREA" || target.tagName === "INPUT";
    if (e.altKey && e.key === "ArrowDown") {
      e.preventDefault();
      focusNextAnswer(target);
      return;
    }
    if (locked || inField || e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toUpperCase();
    if ((LETTERS as readonly string[]).includes(key)) {
      e.preventDefault();
      chooseLetter(c, q, key);
    } else if (e.key === "Enter" && target.tagName !== "BUTTON") {
      e.preventDefault();
      void validate(c, q.position);
    }
  }

  const conflict = (key: string) =>
    key in f.conflicts ? (
      <div role="alert" className="border-sun/60 bg-sun/10 space-y-1 rounded-lg border p-2 text-sm">
        <p className="font-semibold">Ce champ a changé dans un autre onglet.</p>
        <p>Ici : {f.values[key] || "(vide)"}</p>
        <p>Ailleurs : {f.conflicts[key] || "(vide)"}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => f.keepMine(key)}>
            Garder la mienne
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => f.takeTheirs(key)}>
            Prendre l’autre
          </Button>
        </div>
      </div>
    ) : null;

  const answerCard = (
    c: ReviewCopy,
    q: ReviewQuestion,
    opts: { showExpected: boolean; showName: boolean },
  ) => {
    const entry = entryOf(c, q.position);
    const state = answerState(entry);
    const locked = lockedIds.has(c.id);
    const key = `${c.id}|q:${q.position}`;
    const linked = criteriaFor(q);
    return (
      <article
        key={`${c.id}-${q.position}`}
        id={`a-${c.id}-${q.position}`}
        data-answer-card
        aria-label={`Question ${q.position} de ${c.name}`}
        onKeyDown={(e) => onCardKey(e, c, q)}
        className="bg-card space-y-2 rounded-2xl border p-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-base font-bold">
            {opts.showName ? `${c.name} · ` : ""}Question {q.position} · {fmt(q.points)} pt
            {q.points > 1 ? "s" : ""}
          </h3>
          <span
            className={cn(
              "rounded-full border px-2.5 text-xs font-bold",
              state === "validated" && "border-mint/60 text-mint",
              state === "modified" && "border-sun/60 text-sun",
              state === "pending" && "border-sky/60 text-sky",
            )}
          >
            {ANSWER_STATE_LABELS[state]}
          </span>
        </div>
        {opts.showExpected ? (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">
              Énoncé et attendu (pour toi seule)
            </summary>
            <p className="mt-1 whitespace-pre-wrap">{q.statement}</p>
            <p className="bg-muted/50 mt-1 rounded p-2 whitespace-pre-wrap">
              {q.expected || "Pas d’attendu rédigé."}
            </p>
          </details>
        ) : null}
        <p className="bg-muted/30 rounded-lg p-2 text-sm whitespace-pre-wrap">
          {c.answers[String(q.position)]?.trim() || "Pas de réponse."}
        </p>
        <div
          role="group"
          aria-label="Paliers"
          className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4"
        >
          {LETTERS.map((letter) => {
            const on = val(`${key}:letter`) === letter;
            const level = linked[0] ? levelFor(linked[0], letter) : null;
            return (
              <button
                key={letter}
                type="button"
                aria-pressed={on}
                disabled={locked}
                onClick={() => chooseLetter(c, q, letter)}
                className={cn(
                  "focus-visible:ring-ring flex min-h-14 flex-col gap-0.5 rounded-xl border-[1.5px] p-2 text-left text-xs focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60",
                  on ? "border-primary bg-primary/10" : "hover:bg-accent",
                )}
              >
                <span className="font-heading text-base leading-none font-bold">{letter}</span>
                <span className="leading-snug">{level?.description ?? ""}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="block font-medium">Points (sur {fmt(q.points)})</span>
            <Input
              inputMode="decimal"
              className="w-24"
              disabled={locked}
              value={val(`${key}:points`)}
              onChange={(e) => f.set(`${key}:points`, e.target.value)}
            />
          </label>
          <Button
            type="button"
            size="sm"
            disabled={locked || !isLetter(entry.letter) || entry.points === null}
            onClick={() => void validate(c, q.position)}
          >
            {state === "validated" ? "Validée" : "Valider (Entrée)"}
          </Button>
        </div>
        {conflict(`${key}:letter`)}
        {conflict(`${key}:points`)}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Commentaire pour cette question</span>
          <Textarea
            rows={2}
            disabled={locked}
            value={val(`${key}:comment`)}
            onChange={(e) => f.set(`${key}:comment`, e.target.value)}
          />
        </label>
        {conflict(`${key}:comment`)}
      </article>
    );
  };

  const questionsIndex = useMemo(() => {
    const map = new Map<string, ReviewQuestion>();
    for (const c of submitted)
      for (const q of c.drawn) if (!map.has(q.questionId)) map.set(q.questionId, q);
    return [...map.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const currentQuestionId = questionId || questionsIndex[0]?.questionId || "";

  const selected = copies.find((c) => c.id === copyId) ?? copies[0];
  const nextCopy = (() => {
    const list = submitted;
    const i = list.findIndex((c) => c.id === copyId);
    return i === -1 ? null : (list[i + 1] ?? null);
  })();

  function openAnswer(c: ReviewCopy, pos: number) {
    setCopyId(c.id);
    setView("student");
    setTimeout(
      () => document.getElementById(`a-${c.id}-${pos}`)?.scrollIntoView({ block: "center" }),
      50,
    );
  }

  // Vue d'ensemble : étudiant·es × critères, sans total ni classement.
  const linkedCriteria = criteria.filter((k) =>
    Object.values(links).some((ids) => ids.includes(k.id)),
  );
  const overview = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Réponses par étudiant·e et par critère</caption>
        <thead>
          <tr className="text-muted-foreground border-b text-left">
            <th scope="col" className="p-2 font-medium">
              Étudiant·e
            </th>
            {linkedCriteria.map((k) => (
              <th key={k.id} scope="col" className="p-2 font-medium">
                {k.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {copies.map((c) =>
            !c.submitted ? (
              <tr key={c.id} className="bg-muted/40 text-muted-foreground border-b">
                <th scope="row" className="p-2 text-left font-medium">
                  {c.name}
                </th>
                <td colSpan={Math.max(1, linkedCriteria.length)} className="p-2">
                  <span className="mr-3">
                    {c.attendance === "absent_excused"
                      ? "absent·e excusé·e"
                      : c.attendance === "absent_unexcused"
                        ? "absent·e non prévenu·e : 0"
                        : "pas encore rendue"}
                  </span>
                  {c.studentId ? (
                    <select
                      aria-label={`Présence de ${c.name}`}
                      defaultValue={
                        c.attendance && c.attendance !== "present" ? c.attendance : ""
                      }
                      className="border-input bg-background text-foreground min-h-9 rounded-md border px-2"
                      onChange={(e) => {
                        const value = e.target.value;
                        void setCopyAttendance(moduleId, assessmentId, c.studentId!, value).then(
                          (r) => {
                            if (r.error) setMessage(r.error);
                            else router.refresh();
                          },
                        );
                      }}
                    >
                      <option value="">Présence : à poser</option>
                      <option value="absent_excused">Absent·e excusé·e</option>
                      <option value="absent_unexcused">Absent·e non prévenu·e (0)</option>
                    </select>
                  ) : null}
                </td>
              </tr>
            ) : (
              <tr key={c.id} className="border-b">
                <th scope="row" className="p-2 text-left font-medium">
                  {c.name}
                  {lockedIds.has(c.id) ? (
                    <span className="text-muted-foreground block text-xs font-normal">
                      écrite, verrouillée
                    </span>
                  ) : null}
                </th>
                {linkedCriteria.map((k) => {
                  const qs = c.drawn.filter((q) => (links[q.questionId] ?? []).includes(k.id));
                  if (qs.length === 0)
                    return (
                      <td key={k.id} className="text-muted-foreground p-2">
                        —
                      </td>
                    );
                  return (
                    <td key={k.id} className="p-2">
                      <button
                        type="button"
                        onClick={() => openAnswer(c, qs[0].position)}
                        className="focus-visible:ring-ring hover:bg-accent min-h-9 rounded-md border px-2 text-left focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {qs.map((q) => {
                          const e = entryOf(c, q.position);
                          const st = answerState(e);
                          return (
                            <span key={q.position} className="mr-2 inline-block">
                              {isLetter(e.letter) ? e.letter : "·"}
                              <span className="sr-only"> {ANSWER_STATE_LABELS[st]}</span>
                              <span
                                aria-hidden
                                className={cn(
                                  "ml-0.5 text-xs",
                                  st === "validated"
                                    ? "text-mint"
                                    : st === "modified"
                                      ? "text-sun"
                                      : "text-sky",
                                )}
                              >
                                {st === "validated" ? "✓" : st === "modified" ? "!" : ""}
                              </span>
                            </span>
                          );
                        })}
                        {qs.every((q) => answerState(entryOf(c, q.position)) === "pending") ? (
                          <span className="text-sky text-xs">à valider</span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );

  const byQuestion = (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Question</span>
        <select
          value={currentQuestionId}
          onChange={(e) => setQuestionId(e.target.value)}
          className="border-input bg-background min-h-11 w-full max-w-xl rounded-md border px-3"
        >
          {questionsIndex.map((q) => (
            <option key={q.questionId} value={q.questionId}>
              {titleOf(q.statement)} ({fmt(q.points)} pt{q.points > 1 ? "s" : ""})
            </option>
          ))}
        </select>
      </label>
      {(() => {
        const first = questionsIndex.find((q) => q.questionId === currentQuestionId);
        return first ? (
          <section
            aria-label="Attendu"
            className="bg-muted/50 space-y-1 rounded-2xl border p-3 text-sm"
          >
            <h2 className="font-heading font-bold">Attendu (pour toi seule)</h2>
            <p className="whitespace-pre-wrap">{first.expected || "Pas d’attendu rédigé."}</p>
          </section>
        ) : null;
      })()}
      {submitted.flatMap((c) =>
        c.drawn
          .filter((q) => q.questionId === currentQuestionId)
          .map((q) => answerCard(c, q, { showExpected: false, showName: true })),
      )}
    </div>
  );

  const byStudent = selected ? (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="space-y-1 text-sm">
          <span className="sr-only">Étudiant·e</span>
          <select
            value={selected.id}
            onChange={(e) => setCopyId(e.target.value)}
            className="border-input bg-background min-h-11 rounded-md border px-3"
          >
            {copies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.submitted ? "" : " (pas encore rendue)"}
              </option>
            ))}
          </select>
        </label>
        {nextCopy ? (
          <Button type="button" variant="outline" onClick={() => setCopyId(nextCopy.id)}>
            Copie suivante : {nextCopy.name}
          </Button>
        ) : null}
        {lockedIds.has(selected.id) ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await reopenCopy(moduleId, assessmentId, selected.id);
                if (res.error) setMessage(res.error);
                else {
                  setLockedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(selected.id);
                    return next;
                  });
                  setMessage("");
                }
              })
            }
          >
            Rouvrir la copie
          </Button>
        ) : null}
      </div>
      {!selected.submitted ? (
        <p className="bg-muted/40 text-muted-foreground rounded-xl border p-3">pas encore rendue</p>
      ) : (
        <>
          {lockedIds.has(selected.id) ? (
            <p role="status" className="bg-muted/50 rounded-xl border p-3 text-sm">
              {selected.legacy
                ? "Copie déjà corrigée : elle s’ouvre en lecture. "
                : "Copie écrite dans l’évaluation : lecture seule. "}
              Clique sur « Rouvrir la copie » pour la modifier. L’étudiant·e garde la note publiée
              jusqu’au prochain « Mettre à jour ».
            </p>
          ) : null}
          {selected.drawn.map((q) =>
            answerCard(selected, q, { showExpected: true, showName: false }),
          )}
          <section
            aria-label="Commentaire global"
            className="bg-card space-y-2 rounded-2xl border p-3"
          >
            <label className="block space-y-1 text-sm">
              <span className="font-heading text-base font-bold">Commentaire global</span>
              <Textarea
                rows={3}
                disabled={lockedIds.has(selected.id)}
                value={val(`${selected.id}|global`)}
                onChange={(e) => f.set(`${selected.id}|global`, e.target.value)}
              />
            </label>
            {conflict(`${selected.id}|global`)}
            <h3 className="font-heading text-base font-bold">Lettre de chaque critère</h3>
            <p className="text-muted-foreground text-xs">
              Pré-choisie seulement quand tous les paliers de ses questions sont identiques.
            </p>
            {criteria
              // Tous les critères à noter : sans question rattachée, Marie choisit la lettre elle-même.
              .filter(
                (k) =>
                  !k.isBonus ||
                  selected.drawn.some((q) => (links[q.questionId] ?? []).includes(k.id)),
              )
              .map((k) => {
                const qs = selected.drawn.filter((q) => (links[q.questionId] ?? []).includes(k.id));
                const suggested = suggestedCriterionLetter(
                  qs.map((q) => val(`${selected.id}|q:${q.position}:letter`)),
                );
                const chosen = val(`${selected.id}|crit:${k.id}`);
                return (
                  <div key={k.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="min-w-40 font-medium">{k.label}</span>
                    {LETTERS.map((letter) => (
                      <button
                        key={letter}
                        type="button"
                        aria-pressed={chosen === letter}
                        disabled={lockedIds.has(selected.id)}
                        onClick={() =>
                          f.set(
                            `${selected.id}|crit:${k.id}`,
                            chosen === letter ? "" : letter,
                            true,
                          )
                        }
                        className={cn(
                          "focus-visible:ring-ring min-h-9 min-w-9 rounded-lg border font-bold focus-visible:ring-2 focus-visible:outline-none",
                          chosen === letter
                            ? "border-primary bg-primary/10"
                            : suggested === letter && !chosen
                              ? "border-primary border-dashed"
                              : "hover:bg-accent",
                        )}
                      >
                        {letter}
                      </button>
                    ))}
                    {suggested && !chosen ? (
                      <span className="text-muted-foreground text-xs">proposée : {suggested}</span>
                    ) : null}
                    {qs.length === 0 ? (
                      <span className="text-muted-foreground text-xs">
                        aucune question rattachée : à toi de choisir
                      </span>
                    ) : null}
                  </div>
                );
              })}
          </section>
        </>
      )}
    </div>
  ) : null;

  // Récapitulatif d'écriture.
  const recaps = submitted.map((c) => {
    const plan = planCopyWrite({
      drawn: liteOf(c),
      entries: entriesOf(c),
      criteria,
      links,
      criterionLetters: lettersOf(c),
      maxScore,
    });
    return { c, plan, locked: lockedIds.has(c.id) };
  });
  const readyRecaps = recaps.filter((r) => !r.locked && r.plan.blockers.length === 0);

  // L'écriture ne dépend pas du rafraîchissement de la page : le bouton revient dès la réponse.
  const [writing, setWriting] = useState(false);
  async function doWrite() {
    setWriting(true);
    try {
      await f.flush();
      const res = await writeReviews(
        moduleId,
        assessmentId,
        readyRecaps.map((r) => r.c.id),
      );
      setWriteResult(res);
      if (!res.error) {
        setLockedIds((prev) => new Set([...prev, ...(res.written ?? [])]));
        startTransition(() => router.refresh());
      }
    } catch {
      setWriteResult({ error: "L’écriture n’a pas abouti : rien n’a changé, réessaie." });
    } finally {
      setWriting(false);
    }
  }

  const status = f.hasConflict
    ? "Conflit à résoudre"
    : f.failed
      ? "Pas enregistré"
      : f.saving
        ? "Enregistrement…"
        : f.dirty
          ? "Modifications en attente…"
          : f.savedAt
            ? `Enregistré à ${f.savedAt}`
            : "Tout est enregistré";

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="bg-background/95 sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2 backdrop-blur">
        <p className="font-semibold">
          {totals.v} réponse{totals.v > 1 ? "s" : ""} validée{totals.v > 1 ? "s" : ""} sur{" "}
          {totals.t}
        </p>
        <div role="group" aria-label="Vue" className="flex gap-1.5">
          {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={view === v ? "default" : "outline"}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {VIEW_LABELS[v]}
            </Button>
          ))}
        </div>
        <p role="status" className={cn("text-sm", f.failed && "text-destructive")}>
          {status}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowLinks((v) => !v)}>
          Rattacher les questions aux critères
        </Button>
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          onClick={() => {
            setWriteResult(null);
            setWriteOpen(true);
          }}
        >
          Enregistrer dans l’évaluation
        </Button>
      </div>

      {message ? (
        <p role="alert" className="text-destructive text-sm font-medium">
          {message}
        </p>
      ) : null}

      {showLinks ? (
        <section
          aria-label="Rattachements"
          className="bg-card space-y-2 rounded-2xl border p-3 text-sm"
        >
          <p className="text-muted-foreground">
            Chaque question se rattache à un ou plusieurs critères de la grille.
          </p>
          {questionsIndex.map((q) => (
            <fieldset key={q.questionId} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <legend className="sr-only">{titleOf(q.statement)}</legend>
              <span className="min-w-60 font-medium">{titleOf(q.statement)}</span>
              {criteria.map((k) => {
                const on = (links[q.questionId] ?? []).includes(k.id);
                return (
                  <label key={k.id} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        const next = on
                          ? (links[q.questionId] ?? []).filter((x) => x !== k.id)
                          : [...(links[q.questionId] ?? []), k.id];
                        setLinks((prev) => ({ ...prev, [q.questionId]: next }));
                        void setQuestionCriteria(moduleId, assessmentId, q.questionId, next);
                      }}
                    />
                    {k.label}
                  </label>
                );
              })}
            </fieldset>
          ))}
        </section>
      ) : null}

      {view === "overview" ? overview : view === "question" ? byQuestion : byStudent}

      {writeOpen ? (
        <dialog
          open
          aria-labelledby="write-title"
          className="bg-background fixed inset-0 z-50 m-auto max-h-[85vh] w-[min(46rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border p-5 shadow-lg"
        >
          <h2 id="write-title" className="font-heading text-xl font-bold">
            Enregistrer dans l’évaluation
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Points par question ; la note est leur somme ramenée sur {maxScore}. Les réponses non
            validées ne seront pas écrites : une copie incomplète reste « en cours » et n’entre ni
            dans les moyennes ni dans la publication. Rien n’est publié.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {recaps.map(({ c, plan, locked }) => (
              <li key={c.id} className="rounded-lg border p-2">
                <p className="font-semibold">
                  {c.name}
                  {locked
                    ? " — déjà écrite"
                    : plan.blockers.length === 0
                      ? ` — ${fmt(plan.total)} / ${fmt(plan.totalMax)} → note ${fmt(plan.value)} / ${maxScore}`
                      : " — reste en cours"}
                </p>
                {!locked && plan.blockers.length === 0 ? (
                  <ul className="text-muted-foreground">
                    {plan.perCriterion.map((line) => (
                      <li key={line.criterionId}>
                        <span className="text-foreground">
                          {line.label} : {line.letter}
                        </span>
                        {line.questions.length
                          ? ` · ${line.questions
                              .map((q) => `Q${q.position} ${fmt(q.points)}/${fmt(q.max)}`)
                              .join(", ")}`
                          : " · sans question rattachée"}
                        {line.questions
                          .filter((q) => q.comment.trim())
                          .map((q) => (
                            <p key={q.position} className="pl-3 text-xs">
                              Q{q.position} : {q.comment.trim()}
                            </p>
                          ))}
                      </li>
                    ))}
                    <li>
                      <span className="text-foreground">Commentaire global : </span>
                      {val(`${c.id}|global`).trim() || "aucun"}
                    </li>
                    {plan.notWritten.length ? (
                      <li className="text-sun">
                        Pas écrit : réponses {plan.notWritten.join(", ")} (non validées).
                      </li>
                    ) : (
                      <li>Pas écrit : rien, toutes les réponses sont validées.</li>
                    )}
                  </ul>
                ) : !locked ? (
                  <ul className="text-sun">
                    {plan.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
          {writeResult?.error ? (
            <p role="alert" className="text-destructive mt-2 text-sm font-medium">
              {writeResult.error}
            </p>
          ) : null}
          {writeResult?.written ? (
            <p role="status" className="mt-2 text-sm font-medium">
              {writeResult.written.length} copie{writeResult.written.length > 1 ? "s" : ""} écrite
              {writeResult.written.length > 1 ? "s" : ""}. Rien n’est publié : la publication reste
              la tienne.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={writing || f.dirty || f.hasConflict || readyRecaps.length === 0}
              onClick={() => void doWrite()}
            >
              {writing
                ? "Écriture…"
                : `Écrire ${readyRecaps.length} copie${readyRecaps.length > 1 ? "s" : ""}`}
            </Button>
            <Button type="button" variant="outline" onClick={() => setWriteOpen(false)}>
              Fermer
            </Button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
