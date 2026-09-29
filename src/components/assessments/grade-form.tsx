"use client";

import { useActionState, useId, useState } from "react";

import type { GradeFormState } from "@/app/(app)/modules/[id]/assessments/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CriterionWithLevels, GridWithCriteria } from "@/lib/assessments/queries";
import {
  computeTotals,
  describeOverflow,
  formatNumber,
  groupByAxis,
} from "@/lib/assessments/scoring";
import { DEFAULT_MAX_SCORE, toTwenty } from "@/lib/ynov/notation";
import type { Tables } from "@/types/db";

type Action = (state: GradeFormState, formData: FormData) => Promise<GradeFormState>;

export function GradeForm({
  action,
  title,
  grid,
  maxScore,
  grade,
  comments,
  autoValidatedIds = [],
}: {
  action: Action;
  title: string;
  grid: GridWithCriteria | null;
  /** Barème effectif de l'évaluation. */
  maxScore: number;
  grade?: Tables<"grade">;
  comments: Tables<"predefined_comment">[];
  /** Critères validés d'office pour cette évaluation : palier le plus haut, sans saisie. */
  autoValidatedIds?: string[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Plusieurs formulaires par page (un par groupe ou par membre) : identifiants uniques.
  const uid = useId();
  const selectedComments = new Set(grade?.predefined_comment_ids ?? []);
  // Saisies en cours (texte) : le total et les sous-totaux se recalculent à chaque frappe.
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries((grade?.scores as Record<string, number> | undefined) ?? {}).map(([id, n]) => [
        id,
        String(n),
      ]),
    ),
  );
  const criteria = grid?.criteria ?? [];
  const totals = computeTotals(
    criteria.map((c) => ({
      id: c.id,
      weight: c.weight,
      axisId: c.axis_id,
      isBonus: c.is_bonus,
    })),
    Object.fromEntries(
      Object.entries(inputs)
        .filter(([, v]) => v.trim() !== "" && Number.isFinite(Number(v.replace(",", "."))))
        .map(([id, v]) => [id, Number(v.replace(",", "."))]),
    ),
    { autoValidatedIds, maxScore },
  );
  const scaled = totals.max !== totals.maxScore;
  const overflow = describeOverflow(totals);
  const groups = grid ? groupByAxis(grid.criteria, grid.axes) : [];
  const showAxes = !!grid && grid.axes.length > 0;

  function subtotal(axisId: string | null): string | null {
    const a = totals.axes.find((x) => x.axisId === axisId);
    if (!a) return null;
    const bonus = a.bonusMax > 0 ? ` + ${formatNumber(a.bonusPoints)} de bonus` : "";
    return `${formatNumber(a.points)} / ${formatNumber(a.max)}${bonus}`;
  }

  function criterionField(c: CriterionWithLevels) {
    const validated = !c.is_bonus && autoValidatedIds.includes(c.id);
    const hintId = `${uid}-hint_${c.id}`;
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
      </div>
    );
  }

  return (
    <form
      action={formAction}
      aria-labelledby={`${uid}-title`}
      className="space-y-4 rounded-lg border p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={`${uid}-title`} className="font-medium">
          {title}
        </h3>
        {grade?.value !== undefined && grade?.value !== null ? (
          <span className="text-muted-foreground text-sm">
            Note actuelle : {grade.value} / {maxScore}
            {maxScore !== DEFAULT_MAX_SCORE ? ` (${toTwenty(grade.value, maxScore)}/20)` : ""}
          </span>
        ) : null}
      </div>

      {grid ? (
        <div className="space-y-4">
          {groups.map((group) =>
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
          <p className="text-muted-foreground text-sm">
            Total : {formatNumber(totals.base)} / {formatNumber(totals.max)}
            {totals.bonus > 0 ? ` + ${formatNumber(totals.bonus)} de bonus` : ""}
            {scaled || totals.capped
              ? ` → ${formatNumber(totals.value)} / ${formatNumber(totals.maxScore)}`
              : ""}
            {overflow ? ` (${overflow})` : ""}
          </p>
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
            defaultValue={grade?.value ?? ""}
            required
          />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor={`${uid}-feedback`}>Appréciation</Label>
        <Textarea
          id={`${uid}-feedback`}
          name="feedback"
          rows={2}
          defaultValue={grade?.feedback ?? ""}
        />
      </div>

      {comments.length > 0 ? (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Commentaires prédéfinis</legend>
          <ul className="max-h-32 space-y-1 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <Checkbox
                  id={`${uid}-comment_${c.id}`}
                  name="predefinedCommentIds"
                  value={c.id}
                  defaultChecked={selectedComments.has(c.id)}
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

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Note enregistrée.
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer la note"}
      </Button>
    </form>
  );
}
