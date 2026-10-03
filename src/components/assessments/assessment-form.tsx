"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { ActionError } from "@/components/action-error";
import type { AssessmentFormState } from "@/app/(app)/modules/[id]/assessments/actions";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AssessmentDetail, GridWithCriteria } from "@/lib/assessments/queries";
import { PREP_STATUS_LABELS, PREP_STATUSES } from "@/lib/assessments/subject";
import type { Tables } from "@/types/db";
import {
  canPrepareMakeupInAdvance,
  frameFor,
  frameWarnings,
  TYPE_PRESETS,
} from "@/lib/assessments/individual";
import { keepFormValues } from "@/lib/use-kept-form";

type Action = (state: AssessmentFormState, formData: FormData) => Promise<AssessmentFormState>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function AssessmentForm({
  action,
  moduleId,
  groups,
  grids,
  courses = [],
  assessment,
}: {
  action: Action;
  moduleId: string;
  groups: Pick<Tables<"student_group">, "id" | "name">[];
  grids: Pick<GridWithCriteria, "id" | "name" | "criteria" | "axes">[];
  /** Séances du module (rattachement du sujet, US-90). */
  courses?: Pick<Tables<"course">, "id" | "title">[];
  assessment?: AssessmentDetail;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const [gridId, setGridId] = useState(assessment?.grading_grid_id ?? "");
  // Cadre selon le type (US-144) : libellé de la date, durée attendue, points à vérifier.
  const [typeText, setTypeText] = useState(assessment?.type ?? "");
  const [dateText, setDateText] = useState(assessment?.date ?? "");
  const [durationText, setDurationText] = useState(String(assessment?.duration_minutes ?? ""));
  const [groupGrade, setGroupGrade] = useState(assessment?.is_group_grade ?? false);
  const frame = frameFor(typeText);
  const warnings = frameWarnings({ type: typeText, date: dateText, durationMinutes: durationText });
  const gridCriteria = (grids.find((g) => g.id === gridId)?.criteria ?? []).filter(
    (c) => !c.is_bonus,
  );
  const autoValidated = new Set(assessment?.auto_validated_criterion_ids ?? []);
  // Un seul groupe dans le module : pré-coché à la création.
  const selectedGroupIds = new Set(
    assessment ? assessment.groups.map((g) => g.id) : groups.length === 1 ? [groups[0].id] : [],
  );

  return (
    <form onSubmit={keepFormValues(formAction)} className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={assessment?.title ?? ""}
          aria-describedby={fe.title ? "title-error" : undefined}
        />
        <FieldError id="title" errors={fe.title} />
      </div>

      <fieldset className="space-y-4">
        <legend className="text-base font-medium">Sujet fourni aux étudiant·es</legend>
        <p className="text-muted-foreground text-sm">
          Rien de ce qui touche à tes notes ou au carnet n’apparaît dans le sujet. Les fichiers
          joints se déposent depuis la page de l’évaluation, une fois enregistrée.
        </p>

        <div className="space-y-2">
          <Label htmlFor="objective">Objectif</Label>
          <Textarea
            id="objective"
            name="objective"
            rows={2}
            maxLength={2000}
            defaultValue={assessment?.objective ?? ""}
            aria-describedby={fe.objective ? "objective-error" : undefined}
          />
          <FieldError id="objective" errors={fe.objective} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Consigne (Markdown)</Label>
          <p id="subject-hint" className="text-muted-foreground text-sm">
            Consignes complètes : titres (#), listes (-), **gras**, `code`… 20 000 caractères
            maximum.
          </p>
          <Textarea
            id="subject"
            name="subject"
            rows={10}
            maxLength={20000}
            defaultValue={assessment?.subject ?? ""}
            aria-describedby={fe.subject ? "subject-hint subject-error" : "subject-hint"}
          />
          <FieldError id="subject" errors={fe.subject} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliverableMd">Rendu attendu (Markdown)</Label>
          <Textarea
            id="deliverableMd"
            name="deliverableMd"
            rows={4}
            maxLength={20000}
            defaultValue={assessment?.deliverable_md ?? ""}
            aria-describedby={fe.deliverableMd ? "deliverableMd-error" : undefined}
          />
          <FieldError id="deliverableMd" errors={fe.deliverableMd} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="evaluatedMd">Ce qui sera évalué (Markdown)</Label>
          <p id="evaluatedMd-hint" className="text-muted-foreground text-sm">
            Les critères de la grille choisie ci-dessous sont annoncés en plus de ce texte.
          </p>
          <Textarea
            id="evaluatedMd"
            name="evaluatedMd"
            rows={4}
            maxLength={20000}
            defaultValue={assessment?.evaluated_md ?? ""}
            aria-describedby={
              fe.evaluatedMd ? "evaluatedMd-hint evaluatedMd-error" : "evaluatedMd-hint"
            }
          />
          <FieldError id="evaluatedMd" errors={fe.evaluatedMd} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="courseId">Séance</Label>
            <select
              id="courseId"
              name="courseId"
              defaultValue={assessment?.course_id ?? ""}
              aria-describedby={fe.courseId ? "courseId-error" : undefined}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">Aucune séance</option>
              {courses.map((c, i) => (
                <option key={c.id} value={c.id}>
                  Séance {i + 1} — {c.title}
                </option>
              ))}
            </select>
            <FieldError id="courseId" errors={fe.courseId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prepStatus">État de préparation</Label>
            <select
              id="prepStatus"
              name="prepStatus"
              defaultValue={assessment?.prep_status ?? "to_build"}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              {PREP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PREP_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="experienceNote">Retour d’expérience (privé)</Label>
        <p id="experienceNote-hint" className="text-muted-foreground text-sm">
          Ce qui a marché, ce qui a coincé, à changer la prochaine fois. Jamais montré aux
          étudiant·es ; à relire quand tu dupliques le module, et non copié.
        </p>
        <Textarea
          id="experienceNote"
          name="experienceNote"
          rows={3}
          maxLength={5000}
          defaultValue={assessment?.experience_note ?? ""}
          aria-describedby={
            fe.experienceNote ? "experienceNote-hint experienceNote-error" : "experienceNote-hint"
          }
        />
        <FieldError id="experienceNote" errors={fe.experienceNote} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Input
            id="type"
            name="type"
            list="assessment-types"
            placeholder="Rendu de fichiers ou de liens, QCM, oral…"
            value={typeText}
            onChange={(e) => setTypeText(e.target.value)}
          />
          <datalist id="assessment-types">
            {TYPE_PRESETS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">{frame.dateLabel}</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={dateText}
            onChange={(e) => setDateText(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Durée (minutes)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            value={durationText}
            onChange={(e) => setDurationText(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coefficient">Coefficient</Label>
          <Input
            id="coefficient"
            name="coefficient"
            type="number"
            step="0.1"
            defaultValue={assessment?.coefficient ?? 1}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="maxScore">Barème (note sur)</Label>
          <p id="maxScore-hint" className="text-muted-foreground text-sm">
            Laisser vide : total de la grille, ou 20 sans grille. Les moyennes YNOV sont toujours
            ramenées sur 20.
          </p>
          <Input
            id="maxScore"
            name="maxScore"
            type="number"
            step="0.5"
            min={0.5}
            className="sm:w-32"
            defaultValue={assessment?.max_score ?? ""}
            aria-describedby={fe.maxScore ? "maxScore-hint maxScore-error" : "maxScore-hint"}
          />
          <FieldError id="maxScore" errors={fe.maxScore} />
        </div>
        <fieldset
          className="space-y-2 sm:col-span-2"
          aria-describedby={fe.studentGroupIds ? "studentGroupIds-error" : undefined}
        >
          <legend className="text-sm leading-none font-medium">Groupes</legend>
          <p className="text-muted-foreground text-sm">
            Coche tous les groupes notés sur cette évaluation : elle compte pour une seule note.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="studentGroupIds"
                    value={g.id}
                    defaultChecked={selectedGroupIds.has(g.id)}
                  />
                  {g.name}
                </label>
              </li>
            ))}
          </ul>
          <FieldError id="studentGroupIds" errors={fe.studentGroupIds} />
        </fieldset>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="gradingGridId">Grille de correction (optionnel)</Label>
          <select
            id="gradingGridId"
            name="gradingGridId"
            value={gridId}
            onChange={(e) => setGridId(e.target.value)}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Aucune — note directe</option>
            {grids.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        {gridCriteria.length > 0 ? (
          <fieldset key={gridId} className="space-y-2 sm:col-span-2">
            <legend className="text-sm leading-none font-medium">
              Critères validés d’office pour cette évaluation
            </legend>
            <p className="text-muted-foreground text-sm">
              Un critère validé d’office reçoit son palier le plus haut sans saisie (ex. déjà validé
              lors d’une phase précédente).
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {gridCriteria.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="autoValidatedCriterionIds"
                      value={c.id}
                      defaultChecked={autoValidated.has(c.id)}
                    />
                    {c.label}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}
      </div>

      <div className="space-y-1 rounded-md border border-dashed p-3 text-sm">
        <p className="text-muted-foreground">{frame.hint}</p>
        {warnings.length > 0 ? (
          <ul role="status" className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isGroupGrade"
          checked={groupGrade}
          onChange={(e) => setGroupGrade(e.target.checked)}
        />
        Note de groupe (une note par groupe coché, coefficient ×1 au lieu de ×3)
      </label>

      {!assessment && canPrepareMakeupInAdvance(groupGrade, false) ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="prepareMakeup" />
          Préparer dès maintenant le sujet de rattrapage (même grille, même coefficient)
        </label>
      ) : null}

      {state.error ? <ActionError error={state.error} /> : null}

      <div className="flex gap-3">
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer
        </PendingButton>
        <Button type="button" variant="ghost" asChild>
          <Link
            href={
              assessment
                ? `/modules/${moduleId}/assessments/${assessment.id}`
                : `/modules/${moduleId}/assessments`
            }
          >
            Annuler
          </Link>
        </Button>
      </div>
    </form>
  );
}
