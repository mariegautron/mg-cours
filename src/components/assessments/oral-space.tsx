"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Flag } from "lucide-react";

import {
  discardOralDraft,
  writeOralNote,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/oral/space-actions";
import {
  OralRoutePanel,
  OralTextsPanel,
  type TextMeta,
} from "@/components/assessments/oral-texts-panel";
import { SubmissionItems } from "@/components/assessments/submission-items";
import type { SubmissionItemLike } from "@/lib/projects/submission-items";
import { textFields } from "@/lib/assessments/oral-texts";
import { useOralFields } from "@/components/assessments/use-oral-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_VALUES,
  isAttendance,
  type Attendance,
} from "@/lib/assessments/attendance";
import {
  diffLines,
  draftProgress,
  isLetter,
  LETTERS,
  letterOf,
  memberValues,
  missingForWrite,
  needsRewrite,
  recap,
  type OralCriterion,
  type WrittenSnapshot,
} from "@/lib/assessments/oral-space";
import { formatNumber } from "@/lib/assessments/scoring";
import { cn } from "@/lib/utils";

export interface OralSpaceInit {
  letters: Record<string, string>;
  criterionNotes: Record<string, string>;
  pad: string;
  personNotes: Record<string, string>;
  attendance: Record<string, string>;
  versions: Record<string, number>;
  absenceRule: "group_all" | "legacy";
  fromExisting: boolean;
  written: WrittenSnapshot | null;
  writtenAt: string | null;
  /** Note actuellement enregistrée par personne (règle d'origine), pour l'ancienne note du récapitulatif. */
  before: Record<string, number | null>;
  hasNote: boolean;
  /** Date de la note écrite (écrite par l'espace, sinon dernière modification de la note existante). */
  noteAt: string | null;
  resultsHref: string;
  texts: Record<string, TextMeta>;
  routed: Record<string, { dest: string; at: string }>;
  /** Prénoms de tous les étudiant·es du module (un texte de groupe n'en contient aucun). */
  moduleNames: string[];
  /** Support déposé pour ce groupe (PDF). */
  support: SubmissionItemLike[];
}

const fmt = (n: number | null) => (n === null ? "—" : formatNumber(n));

/**
 * Espace de correction d'un oral (un groupe ou une personne) : une lettre par critère retenue en
 * direct, notes à trois endroits (critère, bloc-notes du groupe, personne), puis un récapitulatif
 * où apparaissent les points. Aucun point ni total dans les vues de travail.
 */
export function OralSpace({
  moduleId,
  assessmentId,
  subjectId,
  subjectName,
  isGroup,
  members,
  criteria,
  autoValidatedIds,
  maxScore,
  schoolRule,
  init,
  onNext,
  nextLabel,
  nextPending,
  afterOral = false,
}: {
  moduleId: string;
  assessmentId: string;
  subjectId: string;
  subjectName: string;
  isGroup: boolean;
  members: { id: string; name: string }[];
  criteria: OralCriterion[];
  autoValidatedIds: string[];
  maxScore: number | null;
  schoolRule: "keep_group_grade" | "makeup";
  init: OralSpaceInit;
  onNext?: () => void;
  nextLabel?: string;
  nextPending?: boolean;
  /** Le groupe est passé : « Répartir mes notes » est actif. */
  afterOral?: boolean;
}) {
  const initial = useMemo(() => {
    const values: Record<string, string> = { pad: init.pad };
    for (const c of criteria) {
      values[`letter:${c.id}`] = init.letters[c.id] ?? "";
      values[`note:${c.id}`] = init.criterionNotes[c.id] ?? "";
    }
    for (const m of members) {
      values[`person:${m.id}`] = init.personNotes[m.id] ?? "";
      values[`presence:${m.id}`] = init.attendance[m.id] ?? (init.fromExisting ? "present" : "");
    }
    for (const field of textFields(criteria))
      values[`text:${field.id}`] = init.texts[field.id]?.text ?? "";
    values.rule = init.absenceRule;
    return { values, versions: init.versions };
    // L'état de départ ne sert qu'au premier rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const f = useOralFields(moduleId, assessmentId, subjectId, initial);
  const [currentId, setCurrentId] = useState(
    criteria.find((c) => !c.isBonus)?.id ?? criteria[0]?.id,
  );
  const [showRecap, setShowRecap] = useState(false);
  // Un oral dont la note est écrite s'ouvre en lecture : « Modifier » ouvre un brouillon.
  const [editing, setEditing] = useState(!init.hasNote);
  const [noteAt, setNoteAt] = useState<string | null>(init.noteAt);
  const readOnly = !editing;
  const [showTexts, setShowTexts] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const textsRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<HTMLDivElement>(null);
  const [missingTexts, setMissingTexts] = useState<string[]>([]);
  const recapRef = useRef<HTMLHeadingElement>(null);
  const [confirm, setConfirm] = useState(false);
  const [writeState, setWriteState] = useState<{ error?: string; written?: boolean; at?: string }>(
    {},
  );
  const [pendingWrite, startWrite] = useTransition();
  const [pendingDiscard, startDiscard] = useTransition();
  const [written, setWritten] = useState<WrittenSnapshot | null>(init.written);
  const cardsRef = useRef<HTMLDivElement>(null);

  const letters: Record<string, string> = {};
  for (const c of criteria) letters[c.id] = f.values[`letter:${c.id}`] ?? "";
  const attendance: Record<string, Attendance | undefined> = {};
  for (const m of members) {
    const v = f.values[`presence:${m.id}`];
    attendance[m.id] = v && isAttendance(v) ? v : undefined;
  }
  const rule = f.values.rule === "legacy" ? "legacy" : "group_all";

  const current = criteria.find((c) => c.id === currentId) ?? criteria[0];
  const progress = draftProgress(criteria, letters, autoValidatedIds);
  const missing = missingForWrite(criteria, letters, members, attendance, autoValidatedIds);
  const result = recap(criteria, letters, { autoValidatedIds, maxScore });
  const after = memberValues(result.total, result.maxScore, members, attendance, rule, schoolRule);
  const lines = diffLines(members, init.before, after, attendance);
  const rewrite = needsRewrite(
    written,
    letters,
    Object.fromEntries(
      Object.entries(attendance).filter((e): e is [string, Attendance] => e[1] !== undefined),
    ),
  );
  const replaces = init.hasNote;

  function pick(letter: string) {
    if (!current || readOnly) return;
    f.set(`letter:${current.id}`, f.values[`letter:${current.id}`] === letter ? "" : letter, true);
  }

  function onCardsKey(e: React.KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (readOnly && /^[a-d]$/i.test(e.key)) return;
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.tagName === "SELECT")
      return;
    const key = e.key.toUpperCase();
    if (!e.ctrlKey && !e.metaKey && !e.altKey && (LETTERS as readonly string[]).includes(key)) {
      e.preventDefault();
      const idx = LETTERS.indexOf(key as (typeof LETTERS)[number]);
      if (current?.levels[idx]) pick(key);
      return;
    }
    // Les flèches déplacent le focus sans rien enregistrer.
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
      const buttons = Array.from(
        cardsRef.current?.querySelectorAll<HTMLButtonElement>("button[data-palier]") ?? [],
      );
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (at === -1) return;
      e.preventDefault();
      const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      buttons[(at + step + buttons.length) % buttons.length]?.focus();
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

  function write() {
    startWrite(async () => {
      const res = await writeOralNote(moduleId, assessmentId, subjectId, confirm);
      if (res.error) setWriteState({ error: res.error });
      else {
        const at = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        setWriteState({ written: true, at });
        setWritten({
          letters: { ...letters },
          attendance: Object.fromEntries(
            Object.entries(attendance).filter((e): e is [string, Attendance] => !!e[1]),
          ),
          absence_rule: rule,
          value: result.total,
          per_student: after,
        });
        setMissingTexts(res.missingTexts ?? []);
        setConfirm(false);
        setNoteAt(new Date().toISOString());
        setEditing(false);
      }
    });
  }

  const writeLabel = isGroup ? "Écrire la note de groupe" : "Écrire les notes";
  const blocked =
    readOnly || missing.length > 0 || f.dirty || f.hasConflict || (replaces && !confirm);
  const blockedReason = readOnly
    ? "Clique sur « Modifier » pour ouvrir un brouillon avant d’écrire la note."
    : missing.length > 0
      ? missing.join(" ")
      : f.hasConflict
        ? "Résous d’abord le conflit d’enregistrement."
        : f.dirty
          ? "Attends la fin de l’enregistrement."
          : replaces && !confirm
            ? "Confirme le remplacement de la note déjà écrite."
            : "";

  const conflictBox = (field: string, label: string) =>
    field in f.conflicts ? (
      <div role="alert" className="border-sun/60 bg-sun/10 space-y-1 rounded-lg border p-2 text-sm">
        <p className="font-semibold">{label} a changé dans un autre onglet.</p>
        <p>
          <span className="font-medium">Ici :</span> {f.values[field] || "(vide)"}
        </p>
        <p>
          <span className="font-medium">Ailleurs :</span> {f.conflicts[field] || "(vide)"}
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => f.keepMine(field)}>
            Garder la mienne
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => f.takeTheirs(field)}>
            Prendre l’autre
          </Button>
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h3
          id={`copy-${subjectId}-title`}
          tabIndex={-1}
          className="font-heading text-lg font-bold outline-none"
        >
          {subjectName}
        </h3>
        <p
          role="status"
          className={cn("ml-auto text-sm font-medium", f.failed && "text-destructive")}
        >
          {status}
        </p>
        {noteAt ? (
          <p className="text-sm">
            Note écrite le{" "}
            {new Date(noteAt).toLocaleDateString("fr-FR", { day: "numeric", month: "numeric" })} à{" "}
            {new Date(noteAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            {" · "}
            <Link href={init.resultsHref} className="font-semibold underline underline-offset-2">
              Voir les résultats
            </Link>
          </p>
        ) : null}
        {readOnly && (init.hasNote || written) ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Modifier
          </Button>
        ) : null}
        {!readOnly && init.hasNote ? (
          <span className="border-sky/60 text-sky rounded-full border px-2.5 text-xs font-bold">
            Brouillon : rien ne change avant « Écrire la note »
          </span>
        ) : null}
        {written ? (
          <span
            className={cn(
              "rounded-full border px-2.5 text-xs font-bold",
              rewrite ? "border-sun/60 text-sun" : "border-mint/60 text-mint",
            )}
          >
            {rewrite ? "Note à réécrire" : "Note écrite"}
          </span>
        ) : null}
      </div>

      {/* Présence, sur une ligne */}
      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <legend className="sr-only">Présence</legend>
        <span className="font-medium">Présence :</span>
        {members.map((m) => (
          <label key={m.id} className="flex items-center gap-1.5">
            <span>{m.name}</span>
            <select
              value={f.values[`presence:${m.id}`] ?? ""}
              disabled={readOnly}
              onChange={(e) => f.set(`presence:${m.id}`, e.target.value, true)}
              className="border-input bg-background min-h-9 rounded-md border px-1.5"
            >
              <option value="">À poser</option>
              {ATTENDANCE_VALUES.map((a) => (
                <option key={a} value={a}>
                  {ATTENDANCE_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]" onKeyDown={onCardsKey}>
        {/* Critères */}
        <nav aria-label="Critères" className="lg:self-start">
          <ul className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
            {criteria.map((c) => {
              const letter = letters[c.id];
              const on = c.id === current?.id;
              return (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={on ? "step" : undefined}
                    onClick={() => setCurrentId(c.id)}
                    className={cn(
                      "focus-visible:ring-ring flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border px-2.5 text-left text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none lg:whitespace-normal",
                      on ? "border-primary bg-primary/10" : "hover:bg-accent",
                    )}
                  >
                    <span>
                      {c.isBonus ? "Bonus · " : ""}
                      {c.label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 text-xs font-bold",
                        isLetter(letter) ? "border-mint/50 text-mint" : "border-sun/50 text-sun",
                      )}
                    >
                      {isLetter(letter) ? letter : "à noter"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Critère courant */}
        {current ? (
          <section aria-labelledby={`crit-${subjectId}`} className="min-w-0 space-y-2">
            <h4 id={`crit-${subjectId}`} className="font-heading text-base font-bold">
              {current.label}
            </h4>
            <div
              ref={cardsRef}
              role="group"
              aria-label={`Paliers de ${current.label}`}
              className="grid grid-cols-4 gap-1.5"
            >
              {current.levels.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Ce critère n’a pas de paliers : note-le depuis l’écran de correction classique.
                </p>
              ) : (
                current.levels.slice(0, 4).map((level, i) => {
                  const letter = letterOf(i) as string;
                  const on = f.values[`letter:${current.id}`] === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      data-palier
                      aria-pressed={on}
                      disabled={readOnly}
                      onClick={() => pick(letter)}
                      className={cn(
                        "focus-visible:ring-ring flex min-h-20 flex-col gap-1 rounded-xl border-[1.5px] p-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-70",
                        on ? "border-primary bg-primary/10" : "hover:bg-accent",
                      )}
                    >
                      <span className="font-heading text-xl leading-none font-bold">
                        {letter}
                        <span className="sr-only">
                          {" "}
                          : palier {i + 1} sur {current.levels.length}
                        </span>
                      </span>
                      <span className="line-clamp-3 text-xs leading-snug" title={level.description}>
                        {level.description}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Touches A à D, ou clic, Espace, Entrée. Les flèches déplacent seulement le focus.
            </p>
            <div className="space-y-1">
              <label htmlFor={`note-${subjectId}-${current.id}`} className="text-sm font-medium">
                Tes notes sur ce critère (pour toi seule)
              </label>
              <Textarea
                id={`note-${subjectId}-${current.id}`}
                rows={3}
                disabled={readOnly}
                value={f.values[`note:${current.id}`] ?? ""}
                onChange={(e) => f.set(`note:${current.id}`, e.target.value)}
              />
              {conflictBox(`note:${current.id}`, "Cette note")}
            </div>
            {conflictBox(`letter:${current.id}`, "Cette lettre")}
          </section>
        ) : null}

        {/* Notes privées */}
        <aside aria-label="Notes privées" className="space-y-3 lg:self-start">
          <div className="space-y-1">
            <label htmlFor={`pad-${subjectId}`} className="text-sm font-medium">
              Bloc-notes {isGroup ? "du groupe" : "de l’oral"}
            </label>
            <p className="text-sun text-xs font-semibold">Pour toi seule, jamais envoyé</p>
            <Textarea
              id={`pad-${subjectId}`}
              rows={5}
              disabled={readOnly}
              value={f.values.pad ?? ""}
              onChange={(e) => f.set("pad", e.target.value)}
            />
            {conflictBox("pad", "Le bloc-notes")}
          </div>
          {isGroup
            ? members.map((m) => (
                <div key={m.id} className="space-y-1">
                  <label htmlFor={`person-${subjectId}-${m.id}`} className="text-sm font-medium">
                    {m.name}
                  </label>
                  <Textarea
                    id={`person-${subjectId}-${m.id}`}
                    rows={2}
                    disabled={readOnly}
                    value={f.values[`person:${m.id}`] ?? ""}
                    onChange={(e) => f.set(`person:${m.id}`, e.target.value)}
                  />
                  {conflictBox(`person:${m.id}`, `La note de ${m.name}`)}
                </div>
              ))
            : null}
        </aside>
      </div>

      {/* Barre du bas */}
      <div className="bg-background/95 sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 backdrop-blur">
        <p className="text-sm font-semibold">
          {progress.scored}/{progress.total} critères
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const open = !showRecap;
            setShowRecap(open);
            if (open)
              setTimeout(() => {
                const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                recapRef.current?.scrollIntoView({
                  behavior: reduce ? "auto" : "smooth",
                  block: "start",
                });
                recapRef.current?.focus();
              }, 0);
          }}
        >
          {showRecap ? "Masquer le récapitulatif" : "Récapitulatif et note"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const open = !showTexts;
            setShowTexts(open);
            if (open)
              setTimeout(() => {
                const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                textsRef.current?.scrollIntoView({
                  behavior: reduce ? "auto" : "smooth",
                  block: "start",
                });
                textsRef.current?.querySelector<HTMLElement>("h4")?.focus();
              }, 0);
          }}
        >
          {showTexts ? "Masquer les textes" : "Textes à valider"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!afterOral && progress.state !== "complete"}
          title={
            !afterOral && progress.state !== "complete"
              ? "Actif une fois l’oral passé (ou toutes les lettres posées)."
              : undefined
          }
          onClick={() => {
            const open = !showRoute;
            setShowRoute(open);
            if (open)
              setTimeout(() => {
                const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                routeRef.current?.scrollIntoView({
                  behavior: reduce ? "auto" : "smooth",
                  block: "start",
                });
                routeRef.current?.querySelector<HTMLElement>("h4")?.focus();
              }, 0);
          }}
        >
          Répartir mes notes
        </Button>
        {onNext ? (
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            disabled={nextPending}
            onClick={onNext}
          >
            {nextLabel === "Terminer l’oral" ? <Flag aria-hidden /> : <ChevronRight aria-hidden />}
            {nextLabel ?? "Groupe suivant"}
          </Button>
        ) : null}
      </div>

      {showTexts ? (
        <div ref={textsRef}>
          <OralTextsPanel
            moduleId={moduleId}
            assessmentId={assessmentId}
            subjectId={subjectId}
            isGroup={isGroup}
            criteria={criteria}
            letters={letters}
            fields={f}
            initialMeta={init.texts}
            moduleNames={init.moduleNames}
            members={members}
            criterionNotes={Object.fromEntries(
              criteria.map((c) => [c.id, f.values[`note:${c.id}`] ?? ""]),
            )}
            pad={f.values.pad ?? ""}
            readOnly={readOnly}
          />
        </div>
      ) : null}

      {showRoute ? (
        <div ref={routeRef}>
          <OralRoutePanel
            moduleId={moduleId}
            assessmentId={assessmentId}
            subjectId={subjectId}
            criteria={criteria}
            members={members}
            criterionNotes={Object.fromEntries(
              criteria.map((c) => [c.id, f.values[`note:${c.id}`] ?? ""]),
            )}
            personNotes={Object.fromEntries(
              members.map((m) => [m.id, f.values[`person:${m.id}`] ?? ""]),
            )}
            pad={f.values.pad ?? ""}
            routed={init.routed}
            isGroup={isGroup}
          />
        </div>
      ) : null}

      <details className="bg-card rounded-2xl border p-3">
        <summary className="min-h-9 cursor-pointer font-semibold">
          Déposer le support (PDF)
          {init.support.length > 0
            ? ` · ${init.support.length} fichier${init.support.length > 1 ? "s" : ""} déposé${init.support.length > 1 ? "s" : ""}`
            : ""}
        </summary>
        <div className="pt-3">
          <SubmissionItems
            moduleId={moduleId}
            assessmentId={assessmentId}
            rows={[
              {
                owner: { kind: isGroup ? "group" : "student", id: subjectId },
                name: subjectName,
                items: init.support,
              },
            ]}
          />
        </div>
      </details>

      {showRecap ? (
        <section
          aria-labelledby={`recap-${subjectId}`}
          className="bg-card space-y-3 rounded-2xl border p-4"
        >
          <h4
            id={`recap-${subjectId}`}
            ref={recapRef}
            tabIndex={-1}
            className="font-heading text-lg font-bold outline-none"
          >
            Récapitulatif
          </h4>
          <table className="w-full text-sm">
            <caption className="sr-only">Lettres et points par critère</caption>
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th scope="col" className="p-1.5 font-medium">
                  Critère
                </th>
                <th scope="col" className="p-1.5 font-medium">
                  Lettre
                </th>
                <th scope="col" className="p-1.5 font-medium">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {result.perCriterion.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <th scope="row" className="p-1.5 text-left font-medium">
                    {r.label}
                  </th>
                  <td className="p-1.5">{r.letter ?? "—"}</td>
                  <td className="p-1.5">
                    {r.points === null ? "—" : `${fmt(r.points)} / ${fmt(r.max)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="font-heading text-xl font-bold">
            Total : {missing.length > 0 ? "—" : fmt(result.total)} / {fmt(result.maxScore)}
            {result.capped ? " (plafonné)" : ""}
          </p>

          {init.fromExisting || replaces ? (
            <fieldset className="space-y-1 text-sm">
              <legend className="font-semibold">Règle d’absence pour cet oral</legend>
              {init.fromExisting ? (
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    name={`rule-${subjectId}`}
                    checked={rule === "legacy"}
                    onChange={() => f.set("rule", "legacy", true)}
                  />
                  <span>Règle d’origine de cet oral (par défaut)</span>
                </label>
              ) : null}
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name={`rule-${subjectId}`}
                  checked={rule === "group_all"}
                  onChange={() => f.set("rule", "group_all", true)}
                />
                <span>Tout le groupe reçoit la note du groupe, absent·es compris</span>
              </label>
            </fieldset>
          ) : null}

          {isGroup && missing.length === 0 ? (
            <div>
              <p className="text-sm font-semibold">
                {replaces ? "Ancienne note et nouvelle note" : "Note de chaque personne"}
              </p>
              <ul className="text-sm">
                {lines.map((l) => (
                  <li key={l.studentId}>
                    {l.name} : {ATTENDANCE_LABELS[l.attendance]}
                    {replaces ? ` · ${fmt(l.before)} → ${fmt(l.after)}` : ` → ${fmt(l.after)}`}
                    {replaces && l.changed ? " (change)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {replaces ? (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              Remplacer les notes publiées ?
            </label>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={blocked || pendingWrite}
              aria-describedby={blockedReason ? `why-${subjectId}` : undefined}
              onClick={write}
            >
              {pendingWrite ? "Écriture…" : writeLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              hidden={readOnly}
              disabled={pendingDiscard}
              onClick={() => {
                if (
                  !window.confirm(
                    "Abandonner le brouillon ? Les lettres, notes et présences reviennent à l’état d’origine ; la note écrite et les résultats publiés ne bougent pas.",
                  )
                )
                  return;
                startDiscard(async () => {
                  await discardOralDraft(moduleId, assessmentId, subjectId);
                  window.location.reload();
                });
              }}
            >
              Abandonner le brouillon
            </Button>
          </div>
          {blockedReason ? (
            <p id={`why-${subjectId}`} className="text-sun text-sm">
              {blockedReason}
            </p>
          ) : null}
          {missingTexts.length > 0 && writeState.written ? (
            <p role="status" className="text-sun text-sm">
              Textes non validés, donc non écrits : {missingTexts.join(", ")}.
            </p>
          ) : null}
          <div role="status" aria-live="polite" className="text-sm">
            {writeState.written
              ? `Note écrite à ${writeState.at}. Rien n’est publié : la publication reste la tienne.`
              : ""}
          </div>
          {writeState.error ? (
            <p role="alert" className="text-destructive text-sm font-medium">
              {writeState.error}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
