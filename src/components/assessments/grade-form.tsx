"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { ActionError } from "@/components/action-error";
import { CommentField } from "@/components/assessments/comment-field";
import type { GradeFormState } from "@/app/(app)/modules/[id]/assessments/actions";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ATTENDANCE_HINTS,
  ATTENDANCE_LABELS,
  ATTENDANCE_VALUES,
  type Attendance,
  type MemberOverride,
} from "@/lib/assessments/attendance";
import { parseCriterionComments } from "@/lib/assessments/feedback";
import {
  adoptComment,
  parsePoints,
  similarAtSameLevel,
  similarLabel,
  type OtherCopy,
} from "@/lib/assessments/similar";
import {
  axisComment,
  axisCommentKey,
  criteriaToFillWithMiddle,
  levelForDigit,
  moveCriterion,
} from "@/lib/assessments/compact";
import { appendComment, findLevel, levelCommentBase, sortLevels } from "@/lib/assessments/levels";
import type { CriterionWithLevels, GridWithCriteria } from "@/lib/assessments/queries";
import {
  computeTotals,
  describeOverflow,
  formatNumber,
  groupByAxis,
  hasScoredInput,
} from "@/lib/assessments/scoring";
import {
  AUTOSAVE_DELAY_MS,
  formSnapshot,
  shouldAutosave,
  type CopyStatus,
  type ObservationLine,
} from "@/lib/assessments/session";
import { DEFAULT_MAX_SCORE, toTwenty } from "@/lib/ynov/notation";
import type { Tables } from "@/types/db";

type Action = (state: GradeFormState, formData: FormData) => Promise<GradeFormState>;

/** Ce que la session de correction peut demander à une copie. */
export interface CopyControls {
  isDirty: () => boolean;
  save: () => void;
}

interface MemberDraft {
  attendance: Attendance;
  /** Pourcentage saisi ; vide = 100 %. */
  percent: string;
  justification: string;
}

export function GradeForm({
  id,
  action,
  title,
  grid,
  maxScore,
  grade,
  comments,
  autoValidatedIds = [],
  subject = null,
  focusCriterionId = null,
  observations = [],
  members,
  memberOverrides,
  theme = null,
  onStatus,
  register,
  onNavigate,
  hasPrev = false,
  hasNext = false,
  others = [],
}: {
  /** Clé de la copie (identifiant de l'étudiant·e ou du groupe). */
  id: string;
  action: Action;
  title: string;
  grid: GridWithCriteria | null;
  /** Barème effectif de l'évaluation. */
  maxScore: number;
  grade?: Tables<"grade">;
  comments: Tables<"predefined_comment">[];
  /** Critères validés d'office pour cette évaluation : palier le plus haut, sans saisie. */
  autoValidatedIds?: string[];
  /** Matière courante (nom du module) : phrases de la même matière proposées en premier. */
  subject?: string | null;
  /** Vue « un critère pour toute la classe » : seul ce critère est affiché, le reste est conservé. */
  focusCriterionId?: string | null;
  /** Observations de cours (carnet) : consultation seulement. */
  observations?: ObservationLine[];
  /** Membres du groupe (note de groupe) : absence et pondération individuelle par membre. */
  members?: { id: string; name: string }[];
  memberOverrides?: Record<string, MemberOverride>;
  /** Thème du projet fil rouge du groupe (US-89), rappelé pendant la correction. */
  theme?: string | null;
  onStatus?: (id: string, status: CopyStatus) => void;
  register?: (id: string, controls: CopyControls | null) => void;
  onNavigate?: (direction: -1 | 1) => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** Les autres copies de l'évaluation : « déjà noté chez les autres » (US-139). */
  others?: OtherCopy[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Plusieurs formulaires par page (un par groupe ou par membre) : identifiants uniques.
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  // Anciennes sélections par identifiant : conservées (et décochables) tant que la note les porte.
  const linked = new Set(grade?.predefined_comment_ids ?? []);
  const legacyComments = comments.filter((c) => linked.has(c.id));
  // Saisies en cours (texte) : le total et les sous-totaux se recalculent à chaque frappe.
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries((grade?.scores as Record<string, number> | undefined) ?? {}).map(([id, n]) => [
        id,
        String(n),
      ]),
    ),
  );
  const [directValue, setDirectValue] = useState(String(grade?.value ?? ""));
  // Commentaire structuré : un commentaire par critère, points forts, progrès, commentaire libre.
  const [criterionComments, setCriterionComments] = useState(() =>
    parseCriterionComments(grade?.criterion_comments),
  );
  const [strengths, setStrengths] = useState(grade?.strengths ?? "");
  const [progress, setProgress] = useState(grade?.progress ?? "");
  const [feedback, setFeedback] = useState(grade?.feedback ?? "");
  const [announcement, setAnnouncement] = useState("");
  // Vue compacte (US-140) : tous les critères en une page, paliers en pastilles.
  const [compact, setCompact] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const compactRef = useRef<HTMLUListElement>(null);
  // Présence (note individuelle) et ajustements par membre (note de groupe).
  const isGroup = members !== undefined;
  const [attendance, setAttendance] = useState<Attendance>(grade?.attendance ?? "present");
  const [memberState, setMemberState] = useState<Record<string, MemberDraft>>(() =>
    Object.fromEntries(
      (members ?? []).map((m) => {
        const o = memberOverrides?.[m.id];
        return [
          m.id,
          {
            attendance: o?.attendance ?? "present",
            percent: o && o.factor !== 1 ? String(Math.round(o.factor * 100)) : "",
            justification: o?.justification ?? "",
          },
        ];
      }),
    ),
  );
  const absent = !isGroup && attendance !== "present";
  const criteria = grid?.criteria ?? [];

  const numericScores = Object.fromEntries(
    Object.entries(inputs)
      .filter(([, v]) => v.trim() !== "" && Number.isFinite(Number(v.replace(",", "."))))
      .map(([key, v]) => [key, Number(v.replace(",", "."))]),
  );
  const scoringCriteria = criteria.map((c) => ({
    id: c.id,
    weight: c.weight,
    axisId: c.axis_id,
    isBonus: c.is_bonus,
  }));
  const totals = computeTotals(scoringCriteria, numericScores, { autoValidatedIds, maxScore });
  const corrected =
    absent ||
    (grid
      ? hasScoredInput(scoringCriteria, numericScores, autoValidatedIds)
      : directValue.trim() !== "");
  const scaled = totals.max !== totals.maxScore;
  const overflow = describeOverflow(totals);
  const groups = grid ? groupByAxis(grid.criteria, grid.axes) : [];
  const showAxes = !!grid && grid.axes.length > 0;

  // Enregistrement sans perte : une copie est « à enregistrer » tant que sa saisie diffère de la
  // dernière version enregistrée ; elle s'enregistre seule après un court délai sans modification.
  const snapshot = formSnapshot([
    inputs,
    directValue,
    criterionComments,
    strengths,
    progress,
    feedback,
    attendance,
    memberState,
  ]);
  const [saved, setSaved] = useState(snapshot);
  const [submitted, setSubmitted] = useState(snapshot);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.saved) setSaved(submitted);
  }
  const dirty = snapshot !== saved;
  const ready = absent || grid ? true : directValue.trim() !== "";

  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!shouldAutosave({ dirty, pending, ready })) return;
    const timer = setTimeout(() => formRef.current?.requestSubmit(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [snapshot, dirty, pending, ready]);

  useEffect(() => {
    onStatus?.(id, { corrected, dirty });
  }, [id, corrected, dirty, onStatus]);

  useEffect(() => {
    if (!register) return;
    register(id, {
      isDirty: () => dirtyRef.current,
      save: () => formRef.current?.requestSubmit(),
    });
    return () => register(id, null);
  }, [id, register]);

  function subtotal(axisId: string | null): string | null {
    const a = totals.axes.find((x) => x.axisId === axisId);
    if (!a) return null;
    const bonus = a.bonusMax > 0 ? ` + ${formatNumber(a.bonusPoints)} de bonus` : "";
    return `${formatNumber(a.points)} / ${formatNumber(a.max)}${bonus}`;
  }

  function insertBase(c: CriterionWithLevels, text: string) {
    setCriterionComments((prev) => ({ ...prev, [c.id]: appendComment(prev[c.id] ?? "", text) }));
    setAnnouncement(`Description du palier insérée dans le commentaire de « ${c.label} ».`);
  }

  const phraseCriteria = criteria.map((c) => ({ id: c.id, label: c.label }));

  function criterionComment(c: CriterionWithLevels) {
    return (
      <CommentField
        name={`comment_${c.id}`}
        label={`Commentaire — ${c.label}`}
        value={criterionComments[c.id] ?? ""}
        onChange={(value) => setCriterionComments((prev) => ({ ...prev, [c.id]: value }))}
        phrases={comments}
        criteria={phraseCriteria}
        subject={subject}
        fixedCriterion={{ id: c.id, label: c.label }}
      />
    );
  }

  function levelField(c: CriterionWithLevels) {
    const current = inputs[c.id] ?? "";
    const numeric = current.trim() === "" ? null : Number(current.replace(",", "."));
    const selected = findLevel(c.levels, numeric);
    // Points enregistrés qui ne correspondent (plus) à aucun palier : proposés tels quels pour
    // qu'enregistrer la note ne les efface jamais.
    const orphan = numeric !== null && Number.isFinite(numeric) && !selected ? numeric : null;
    const base = levelCommentBase(c.label, selected);
    const similar = similarAtSameLevel({
      criterionId: c.id,
      points: parsePoints(current),
      others,
      currentId: id,
    });
    const name = `score_${c.id}`;
    const option = (
      value: string,
      checked: boolean,
      optionId: string,
      children: React.ReactNode,
    ) => (
      <label
        key={optionId}
        htmlFor={optionId}
        className="hover:bg-muted/50 has-[:checked]:border-primary flex cursor-pointer items-start gap-2 rounded-md border border-transparent p-1.5 text-sm"
      >
        <input
          id={optionId}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={() => setInputs((prev) => ({ ...prev, [c.id]: value }))}
          className="mt-1"
        />
        <span>{children}</span>
      </label>
    );

    return (
      <fieldset key={c.id} className="space-y-1 sm:col-span-2">
        <legend className="text-sm font-medium">
          {c.label}{" "}
          <span className="text-muted-foreground">
            {c.is_bonus ? `(bonus, jusqu’à +${c.weight})` : `(/${c.weight})`}
          </span>
        </legend>
        {c.reference ? (
          <p className="text-muted-foreground text-xs">Référence : {c.reference}</p>
        ) : null}
        <div className="space-y-0.5">
          {c.levels.map((l) =>
            option(
              String(l.points),
              selected?.id === l.id,
              `${uid}-level_${l.id}`,
              <>
                <strong>{formatNumber(l.points)} pt</strong>
                {l.description ? ` — ${l.description}` : ""}
              </>,
            ),
          )}
          {orphan !== null
            ? option(
                String(orphan),
                true,
                `${uid}-orphan_${c.id}`,
                <>
                  <strong>{formatNumber(orphan)} pt</strong> — saisie précédente, hors des paliers
                  actuels
                </>,
              )
            : null}
          {option("", current.trim() === "", `${uid}-none_${c.id}`, "Pas encore noté")}
        </div>
        {base ? (
          <Button type="button" size="sm" variant="outline" onClick={() => insertBase(c, base)}>
            Insérer dans le commentaire
            <span className="sr-only"> la description du palier choisi pour {c.label}</span>
          </Button>
        ) : null}
        {criterionComment(c)}
        {similar.length > 0 ? (
          <div className="space-y-1 rounded-md border border-dashed p-2 text-sm">
            <p className="font-medium">Déjà noté chez les autres</p>
            <ul className="space-y-1">
              {similar.map((entry) => (
                <li
                  key={entry.copyId}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-muted-foreground">{similarLabel(entry)}</span>
                  {entry.comment ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const next = adoptComment(criterionComments[c.id] ?? "", entry);
                        if (!next.changed) {
                          setAnnouncement(`Ce commentaire est déjà dans « ${c.label} ».`);
                          return;
                        }
                        setCriterionComments((prev) => ({ ...prev, [c.id]: next.comment }));
                        setAnnouncement(
                          `Commentaire de ${entry.title} repris pour « ${c.label} ».`,
                        );
                      }}
                    >
                      Même palier et commentaire
                      <span className="sr-only">
                        {" "}
                        de {entry.title} pour {c.label}
                      </span>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </fieldset>
    );
  }

  function criterionField(c: CriterionWithLevels) {
    const validated = !c.is_bonus && autoValidatedIds.includes(c.id);
    const hintId = `${uid}-hint_${c.id}`;
    if (!validated && c.levels.length > 0) return levelField(c);
    return (
      <div key={c.id} className="space-y-1">
        {validated ? (
          <>
            <p className="text-sm leading-none font-medium">
              {c.label} <span className="text-muted-foreground">(/{c.weight})</span>
            </p>
            <p className="text-sm">
              Validé d’office : {formatNumber(c.weight)} / {formatNumber(c.weight)}
            </p>
          </>
        ) : (
          <>
            <Label htmlFor={`${uid}-score_${c.id}`}>
              {c.label}{" "}
              <span className="text-muted-foreground">
                {c.is_bonus ? `(bonus, jusqu’à +${c.weight})` : `(/${c.weight})`}
              </span>
            </Label>
            <Input
              id={`${uid}-score_${c.id}`}
              name={`score_${c.id}`}
              type="number"
              step="0.5"
              min={0}
              max={c.weight}
              value={inputs[c.id] ?? ""}
              onChange={(e) => setInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
              aria-describedby={c.reference ? hintId : undefined}
            />
          </>
        )}
        {c.reference ? (
          <p id={hintId} className="text-muted-foreground text-xs">
            Référence : {c.reference}
          </p>
        ) : null}
        {c.description ? (
          <details>
            <summary className="text-muted-foreground cursor-pointer text-xs">
              Voir le barème
            </summary>
            <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
              {c.description}
            </p>
          </details>
        ) : null}
        {criterionComment(c)}
      </div>
    );
  }

  function setLevel(c: CriterionWithLevels, points: number) {
    setInputs((prev) => ({ ...prev, [c.id]: String(points) }));
    setAnnouncement(`${c.label} : ${formatNumber(points)} point${points > 1 ? "s" : ""}.`);
  }

  function fillMiddle() {
    const todo = criteriaToFillWithMiddle(criteria, inputs, autoValidatedIds);
    if (todo.length === 0) {
      setAnnouncement("Rien à remplir : tous les critères à paliers ont déjà une note.");
      return;
    }
    setInputs((prev) => ({
      ...prev,
      ...Object.fromEntries(todo.map((t) => [t.id, String(t.points)])),
    }));
    setAnnouncement(`${todo.length} critère${todo.length > 1 ? "s" : ""} mis au palier moyen.`);
  }

  function toggleComment(id: string) {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Clavier de la vue compacte : ↑ ↓ changent de critère, un chiffre choisit le palier, C ouvre le commentaire. */
  function onCompactKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement;
    if (
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLInputElement && target.type !== "radio")
    ) {
      return;
    }
    const rows = Array.from(
      compactRef.current?.querySelectorAll<HTMLElement>("[data-crit-row]") ?? [],
    );
    const index = rows.findIndex((r) => r.contains(target));
    if (index === -1) return;
    const next = moveCriterion(index, e.key, rows.length);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (next !== null) {
        const row = rows[next];
        row
          .querySelector<HTMLElement>(
            "input[type=radio]:checked, input[type=radio], input[type=number]",
          )
          ?.focus();
      }
      return;
    }
    const criterion = criteria.find((c) => c.id === rows[index].dataset.critRow);
    if (!criterion) return;
    if (e.key.toLowerCase() === "c") {
      e.preventDefault();
      setOpenComments((prev) => new Set(prev).add(criterion.id));
      setTimeout(() => document.getElementById(`${uid}-cm-${criterion.id}`)?.focus(), 0);
      return;
    }
    const level = levelForDigit(criterion.levels, e.key);
    if (level && !(!criterion.is_bonus && autoValidatedIds.includes(criterion.id))) {
      e.preventDefault();
      setLevel(criterion, level.points);
    }
  }

  function compactRow(c: CriterionWithLevels) {
    const validated = !c.is_bonus && autoValidatedIds.includes(c.id);
    const current = inputs[c.id] ?? "";
    const numeric = current.trim() === "" ? null : Number(current.replace(",", "."));
    const selected = findLevel(c.levels, numeric);
    const orphan =
      numeric !== null && Number.isFinite(numeric) && !selected && c.levels.length > 0
        ? numeric
        : null;
    const comment = criterionComments[c.id] ?? "";
    const commentOpen = openComments.has(c.id) || comment.trim() !== "";
    const labelId = `${uid}-ct-${c.id}`;
    const pill =
      "has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-ring hover:bg-muted flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-medium has-[:focus-visible]:ring-2";
    return (
      <li key={c.id} data-crit-row={c.id} className="space-y-2 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span id={labelId} className="font-medium">
            {c.label}{" "}
            <span className="text-muted-foreground text-sm font-normal">
              {c.is_bonus
                ? `(bonus, jusqu’à +${c.weight})`
                : `(${c.weight} point${c.weight > 1 ? "s" : ""})`}
            </span>
          </span>
          {validated ? (
            <span className="text-sm">
              Validé d’office : {formatNumber(c.weight)} / {formatNumber(c.weight)}
            </span>
          ) : c.levels.length > 0 ? (
            <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
              {sortLevels(c.levels).map((l) => (
                <label key={l.id} className={pill}>
                  <input
                    type="radio"
                    name={`score_${c.id}`}
                    value={String(l.points)}
                    checked={selected?.id === l.id}
                    onChange={() => setLevel(c, l.points)}
                    className="sr-only"
                  />
                  {formatNumber(l.points)}
                  <span className="sr-only"> point{l.points > 1 ? "s" : ""}</span>
                </label>
              ))}
              {orphan !== null ? (
                <label className={pill}>
                  <input
                    type="radio"
                    name={`score_${c.id}`}
                    value={String(orphan)}
                    checked
                    readOnly
                    className="sr-only"
                  />
                  {formatNumber(orphan)}
                  <span className="sr-only">
                    {" "}
                    point{orphan > 1 ? "s" : ""} (hors des paliers actuels)
                  </span>
                </label>
              ) : null}
              <label className={pill}>
                <input
                  type="radio"
                  name={`score_${c.id}`}
                  value=""
                  checked={current.trim() === ""}
                  onChange={() => setInputs((prev) => ({ ...prev, [c.id]: "" }))}
                  className="sr-only"
                />
                —<span className="sr-only"> pas encore noté</span>
              </label>
            </div>
          ) : (
            <Input
              name={`score_${c.id}`}
              type="number"
              step="0.5"
              min={0}
              max={c.weight}
              value={current}
              aria-labelledby={labelId}
              onChange={(e) => setInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
              className="w-24"
            />
          )}
        </div>
        {commentOpen ? (
          <Input
            id={`${uid}-cm-${c.id}`}
            name={`comment_${c.id}`}
            aria-label={`Commentaire — ${c.label}`}
            value={comment}
            maxLength={4000}
            autoComplete="off"
            onChange={(e) => setCriterionComments((prev) => ({ ...prev, [c.id]: e.target.value }))}
          />
        ) : (
          <>
            <input type="hidden" name={`comment_${c.id}`} value={comment} />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-expanded={false}
              onClick={() => toggleComment(c.id)}
            >
              + commentaire<span className="sr-only"> pour {c.label}</span>
            </Button>
          </>
        )}
      </li>
    );
  }

  function compactView() {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="secondary" onClick={fillMiddle}>
            Mettre les critères non notés au palier moyen
          </Button>
          <p className="text-muted-foreground text-xs">
            Au clavier : ↑ ↓ changent de critère, un chiffre choisit le palier (ses points), C ouvre
            le commentaire, Alt + ← / → change de copie.
          </p>
        </div>
        <ul ref={compactRef} onKeyDown={onCompactKeyDown} className="divide-y">
          {groups.flatMap((group) => {
            const axisId = group.axis?.id ?? null;
            const head = showAxes ? (
              <li key={`head-${axisId ?? "none"}`} className="pt-3 pb-1">
                <p className="text-sm font-semibold">
                  {group.axis?.label ?? "Autres critères"}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    — sous-total : {subtotal(axisId)}
                  </span>
                </p>
              </li>
            ) : null;
            const foot =
              showAxes && axisId ? (
                <li key={`axis-${axisId}`} className="space-y-1 py-3">
                  <Label htmlFor={`${uid}-axis-${axisId}`}>
                    Un mot pour tout l’axe « {group.axis?.label} »
                  </Label>
                  <Input
                    id={`${uid}-axis-${axisId}`}
                    name={`comment_${axisCommentKey(axisId)}`}
                    value={axisComment(criterionComments, axisId)}
                    maxLength={4000}
                    autoComplete="off"
                    onChange={(e) =>
                      setCriterionComments((prev) => ({
                        ...prev,
                        [axisCommentKey(axisId)]: e.target.value,
                      }))
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Le commentaire par axe suffit souvent : celui par critère reste facultatif.
                  </p>
                </li>
              ) : null;
            return [head, ...group.criteria.map(compactRow), foot].filter(Boolean);
          })}
        </ul>
      </div>
    );
  }

  // Commentaires d'axe conservés et renvoyés quand la vue compacte n'est pas affichée.
  const hiddenAxisComments = grid
    ? grid.axes.map((a) => (
        <input
          key={a.id}
          type="hidden"
          name={`comment_${axisCommentKey(a.id)}`}
          value={axisComment(criterionComments, a.id)}
        />
      ))
    : null;

  const totalLine = (
    <p className="text-muted-foreground text-sm" aria-live={compact ? "polite" : undefined}>
      Total : {formatNumber(totals.base)} / {formatNumber(totals.max)}
      {totals.bonus > 0 ? ` + ${formatNumber(totals.bonus)} de bonus` : ""}
      {scaled || totals.capped
        ? ` → ${formatNumber(totals.value)} / ${formatNumber(totals.maxScore)}`
        : ""}
      {overflow ? ` (${overflow})` : ""}
    </p>
  );

  // Saisie des critères non affichés (vue par critère, ou copie absente) : conservée et renvoyée.
  const hiddenCriteria = (exceptId: string | null) =>
    criteria
      .filter((c) => c.id !== exceptId)
      .map((c) => (
        <span key={c.id} hidden>
          {inputs[c.id] !== undefined && inputs[c.id].trim() !== "" ? (
            <input type="hidden" name={`score_${c.id}`} value={inputs[c.id]} />
          ) : null}
          <input type="hidden" name={`comment_${c.id}`} value={criterionComments[c.id] ?? ""} />
        </span>
      ));

  const hiddenMembers = members ? (
    <>
      <input type="hidden" name="memberOverrides" value="1" />
      {members.map((m) => {
        const st = memberState[m.id];
        return (
          <span key={m.id} hidden>
            <input type="hidden" name={`member_${m.id}_attendance`} value={st.attendance} />
            {st.attendance === "present" ? (
              <>
                <input type="hidden" name={`member_${m.id}_factor`} value={st.percent} />
                <input
                  type="hidden"
                  name={`member_${m.id}_justification`}
                  value={st.justification}
                />
              </>
            ) : null}
          </span>
        );
      })}
    </>
  ) : null;

  function membersFieldset(list: { id: string; name: string }[]) {
    const update = (id: string, patch: Partial<MemberDraft>) =>
      setMemberState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Membres du groupe</legend>
        <p className="text-muted-foreground text-xs">
          Absence ou pondération individuelle (oral) : la note du groupe n’est jamais modifiée. Une
          pondération différente de 100 % exige une justification, affichée dans le résultat.
        </p>
        <input type="hidden" name="memberOverrides" value="1" />
        <ul className="space-y-3">
          {list.map((m) => {
            const st = memberState[m.id];
            const percent = Number(st.percent.replace(",", "."));
            const weighted = st.percent.trim() !== "" && percent !== 100;
            return (
              <li key={m.id} className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">{m.name}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor={`${uid}-att_${m.id}`}>Présence de {m.name}</Label>
                    <select
                      id={`${uid}-att_${m.id}`}
                      name={`member_${m.id}_attendance`}
                      value={st.attendance}
                      onChange={(e) => update(m.id, { attendance: e.target.value as Attendance })}
                      className="border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                    >
                      {ATTENDANCE_VALUES.map((value) => (
                        <option key={value} value={value}>
                          {ATTENDANCE_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {st.attendance === "present" ? (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor={`${uid}-pct_${m.id}`}>Pondération de {m.name} (%)</Label>
                        <Input
                          id={`${uid}-pct_${m.id}`}
                          name={`member_${m.id}_factor`}
                          type="number"
                          min={0}
                          max={200}
                          step={1}
                          placeholder="100"
                          value={st.percent}
                          onChange={(e) => update(m.id, { percent: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${uid}-why_${m.id}`}>
                          Justification de la pondération de {m.name}
                          {weighted ? " (obligatoire)" : ""}
                        </Label>
                        <Input
                          id={`${uid}-why_${m.id}`}
                          name={`member_${m.id}_justification`}
                          value={st.justification}
                          maxLength={1000}
                          aria-required={weighted}
                          onChange={(e) => update(m.id, { justification: e.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs sm:col-span-2">
                      {ATTENDANCE_HINTS[st.attendance]}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </fieldset>
    );
  }

  const focused = grid && focusCriterionId ? criteria.find((c) => c.id === focusCriterionId) : null;

  return (
    <form
      ref={formRef}
      id={`copy-${id}`}
      action={formAction}
      noValidate
      onSubmit={() => setSubmitted(snapshot)}
      onKeyDown={(e) => {
        // Alt + ← / → : copie précédente / suivante, sans quitter le clavier.
        if (!onNavigate || !e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === "ArrowLeft" && hasPrev) {
          e.preventDefault();
          onNavigate(-1);
        } else if (e.key === "ArrowRight" && hasNext) {
          e.preventDefault();
          onNavigate(1);
        }
      }}
      aria-labelledby={`copy-${id}-title`}
      className="space-y-4 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`copy-${id}-title`} tabIndex={-1} className="font-medium">
          {title}
        </h3>
        {grade?.value !== undefined && grade?.value !== null ? (
          <span className="text-muted-foreground text-sm">
            Note actuelle : {grade.value} / {maxScore}
            {maxScore !== DEFAULT_MAX_SCORE ? ` (${toTwenty(grade.value, maxScore)}/20)` : ""}
          </span>
        ) : null}
      </div>
      {theme ? <p className="text-sm">Thème : {theme}</p> : null}

      {observations.length > 0 ? (
        <details className="rounded-md border p-2">
          <summary className="cursor-pointer text-sm font-medium">
            Observations de cours ({observations.length})
          </summary>
          <ul className="mt-2 space-y-1 text-sm">
            {observations.map((o) => (
              <li key={o.id}>
                <span className="text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                  {observations.some((x) => x.studentId !== o.studentId)
                    ? ` · ${o.studentName}`
                    : ""}
                  {" · "}
                  {o.tag}
                </span>
                {o.note ? ` — ${o.note}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {isGroup ? null : focused ? (
        <input type="hidden" name="attendance" value={attendance} />
      ) : (
        <fieldset className="space-y-1">
          <legend className="text-sm font-semibold">Présence</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {ATTENDANCE_VALUES.map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="attendance"
                  value={value}
                  checked={attendance === value}
                  onChange={() => setAttendance(value)}
                />
                {ATTENDANCE_LABELS[value]}
              </label>
            ))}
          </div>
          {ATTENDANCE_HINTS[attendance] ? (
            <p className="text-muted-foreground text-xs">{ATTENDANCE_HINTS[attendance]}</p>
          ) : null}
        </fieldset>
      )}

      {focused ? (
        <div className="space-y-4">
          {absent ? (
            <p className="text-sm">
              {ATTENDANCE_LABELS[attendance]}. {ATTENDANCE_HINTS[attendance]}
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">{criterionField(focused)}</div>
              {totalLine}
            </>
          )}
          {/* Les autres critères et le bilan ne sont pas affichés dans cette vue, mais leur saisie
              est conservée et renvoyée : enregistrer ne perd rien. */}
          {hiddenCriteria(absent ? null : focused.id)}
          {hiddenAxisComments}
          <input type="hidden" name="strengths" value={strengths} />
          <input type="hidden" name="progress" value={progress} />
          <input type="hidden" name="feedback" value={feedback} />
          {hiddenMembers}
        </div>
      ) : (
        <>
          {absent ? (
            <>
              <p className="bg-muted rounded-md p-2 text-sm">
                {ATTENDANCE_LABELS[attendance]} : les critères ne sont pas notés pour cette copie.
              </p>
              {hiddenCriteria(null)}
              {hiddenAxisComments}
            </>
          ) : grid ? (
            <div className="space-y-4">
              <div
                role="group"
                aria-label="Affichage des critères"
                className="flex flex-wrap gap-2"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={compact ? "outline" : "default"}
                  aria-pressed={!compact}
                  onClick={() => setCompact(false)}
                >
                  Détaillé
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={compact ? "default" : "outline"}
                  aria-pressed={compact}
                  onClick={() => setCompact(true)}
                >
                  Tous les critères d’un coup
                </Button>
              </div>
              {compact ? compactView() : hiddenAxisComments}
              {(compact ? [] : groups).map((group) =>
                showAxes ? (
                  <fieldset key={group.axis?.id ?? "none"} className="space-y-3">
                    <legend className="text-sm font-semibold">
                      {group.axis?.label ?? "Autres critères"}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        — sous-total : {subtotal(group.axis?.id ?? null)}
                      </span>
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.criteria.map(criterionField)}
                    </div>
                  </fieldset>
                ) : (
                  <div key="all" className="grid gap-3 sm:grid-cols-2">
                    {group.criteria.map(criterionField)}
                  </div>
                ),
              )}
              {totalLine}
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor={`${uid}-value`}>Note (/{maxScore})</Label>
              <Input
                id={`${uid}-value`}
                name="value"
                type="number"
                step="0.5"
                min={0}
                max={maxScore}
                value={directValue}
                onChange={(e) => setDirectValue(e.target.value)}
                required
              />
            </div>
          )}

          {members ? membersFieldset(members) : null}

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Bilan</legend>
            <CommentField
              name="strengths"
              label="Points forts"
              value={strengths}
              onChange={setStrengths}
              phrases={comments}
              criteria={phraseCriteria}
              subject={subject}
              categories={["positive"]}
            />
            <CommentField
              name="progress"
              label="Progrès"
              value={progress}
              onChange={setProgress}
              phrases={comments}
              criteria={phraseCriteria}
              subject={subject}
              categories={["advice", "negative"]}
            />
            <CommentField
              name="feedback"
              label="Commentaire libre"
              value={feedback}
              onChange={setFeedback}
              phrases={comments}
              criteria={phraseCriteria}
              subject={subject}
            />
          </fieldset>
        </>
      )}

      {legacyComments.length > 0 ? (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Commentaires prédéfinis (ancien mode)</legend>
          <p className="text-muted-foreground text-xs">
            Déjà liés à cette note ; décoche pour les retirer. Les nouvelles phrases s’insèrent
            directement dans les commentaires.
          </p>
          <ul className="space-y-1">
            {legacyComments.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <Checkbox
                  id={`${uid}-comment_${c.id}`}
                  name="predefinedCommentIds"
                  value={c.id}
                  defaultChecked
                  className="mt-0.5"
                />
                <Label htmlFor={`${uid}-comment_${c.id}`} className="font-normal">
                  {c.text}
                </Label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {state.error ? <ActionError error={state.error} /> : null}
      {dirty ? (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          Modifications non enregistrées
        </p>
      ) : state.saved ? (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          Note enregistrée. {title} est à jour.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <PendingButton type="submit" size="sm" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer la note
        </PendingButton>
        {onNavigate ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hasPrev}
              onClick={() => onNavigate(-1)}
            >
              Copie précédente
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hasNext}
              onClick={() => onNavigate(1)}
            >
              Copie suivante
            </Button>
            <span className="text-muted-foreground text-xs">
              Alt + ← / → : copie précédente / suivante
            </span>
          </>
        ) : null}
      </div>
    </form>
  );
}
