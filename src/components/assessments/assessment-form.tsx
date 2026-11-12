"use client";

import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { GROUP_COEFFICIENT, INDIVIDUAL_COEFFICIENT } from "@/lib/ynov/notation";
import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";

import { ActionError } from "@/components/action-error";
import type { AssessmentFormState } from "@/app/(app)/modules/[id]/assessments/actions";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AssessmentDetail, GridWithCriteria } from "@/lib/assessments/queries";
import { kindOf } from "@/lib/assessments/individual";
import {
  ASSESSMENT_KINDS,
  assessmentKindOf,
  kindBlocks,
  kindOption,
  typeTextForKind,
  type AssessmentKind,
} from "@/lib/assessments/kind";
import { PREP_STATUS_LABELS, PREP_STATUSES } from "@/lib/assessments/subject";
import type { Tables } from "@/types/db";
import { canPrepareMakeupInAdvance, frameFor, frameWarnings } from "@/lib/assessments/individual";
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
  initialGridId = "",
  coefficients = { group: GROUP_COEFFICIENT, individual: INDIVIDUAL_COEFFICIENT },
  reviewTargets = [],
  initialType,
  children,
}: {
  action: Action;
  moduleId: string;
  groups: Pick<Tables<"student_group">, "id" | "name">[];
  grids: Pick<GridWithCriteria, "id" | "name" | "criteria" | "axes">[];
  /** Séances du module (rattachement du sujet, US-90). */
  courses?: (Pick<Tables<"course">, "id" | "title"> & { session_date?: string | null })[];
  assessment?: AssessmentDetail;
  /** Grille choisie depuis la bibliothèque (US-126). */
  initialGridId?: string;
  /** Hérité (ancienne case « Jalon du projet fil rouge », retirée) : ignoré. */
  hasProject?: boolean;
  /** Coefficients de l'école du module (YNOV par défaut). */
  coefficients?: { group: number; individual: number };
  /** Évaluations notées du module auxquelles un point d'étape peut se rattacher. */
  reviewTargets?: { id: string; title: string; gradingGridId: string | null; isGroup: boolean }[];
  /** Type choisi d'avance (« Créer un point d'étape »). */
  initialType?: string;
  /** Sections annexes (fichiers joints…), placées au-dessus du bouton Enregistrer. */
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const [gridId, setGridId] = useState(assessment?.grading_grid_id ?? initialGridId);
  // Type d'évaluation unique (lot 5) : choisi en premier, il règle groupe / individuel par défaut
  // et les blocs affichés. `type` (texte) suit le choix, en gardant un libellé déjà cohérent.
  const [kind, setKind] = useState<AssessmentKind | null>(
    assessment
      ? assessmentKindOf(assessment)
      : initialType
        ? assessmentKindOf({ type: initialType })
        : null,
  );
  const option = kind ? kindOption(kind) : null;
  const blocks = kindBlocks(kind ?? "other");
  const legacyType = kindOf(assessment?.type) === "checkpoint" ? "Point d’étape" : assessment?.type;
  // Cadre selon le type (US-144) : libellé de la date, durée attendue, points à vérifier.
  const typeText = kind ? typeTextForKind(kind, legacyType ?? initialType) : (legacyType ?? "");
  const [dateText, setDateText] = useState(assessment?.date ?? "");
  const [durationText, setDurationText] = useState(String(assessment?.duration_minutes ?? ""));
  const [courseId, setCourseId] = useState(assessment?.course_id ?? "");
  const [groupGrade, setGroupGrade] = useState(assessment?.is_group_grade ?? false);
  const coefficientFor = (isGroup: boolean) =>
    isGroup ? coefficients.group : coefficients.individual;
  const ruleCoefficient = coefficientFor(groupGrade);
  // Seule une « Note de l'école » porte un coefficient imposé (coefficient_override) ; ailleurs,
  // c'est toujours la règle de l'école (groupe / individuel) qui s'applique.
  const [coefficientText, setCoefficientText] = useState(
    String(assessment?.coefficient_override ?? 1),
  );
  const selectedCourseDate = courses.find((c) => c.id === courseId)?.session_date?.slice(0, 10);
  const dateMismatch = !!(selectedCourseDate && dateText && dateText !== selectedCourseDate);
  const formatFr = (d: string) => new Date(d).toLocaleDateString("fr-FR");
  const frame = frameFor(typeText);
  const whereKind = kindOf(typeText);
  // Point d'étape : sans note, rattaché à l'évaluation notée qui le prend en compte.
  const isCheckpoint = kind === "progress_review";
  // Case « Noté » (décochée par défaut) : un point d'étape noté est une évaluation notée normale.
  const [reviewGraded, setReviewGraded] = useState(assessment?.review_graded ?? false);
  const isReview = isCheckpoint && !reviewGraded;
  const [reviewForId, setReviewForId] = useState(assessment?.review_for_id ?? "");
  const reviewSelected = new Set(assessment?.review_criterion_ids ?? []);
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
    <>
      <form
        id="assessment-form"
        onSubmit={keepFormValues(formAction)}
        className="max-w-xl space-y-6"
      >
        <UnsavedChangesGuard />
        <fieldset className="space-y-2">
          <legend className="text-base font-medium">Type d’évaluation</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ASSESSMENT_KINDS.map((k) => (
              <li key={k.value}>
                <label
                  className={`has-[:focus-visible]:ring-ring flex h-full cursor-pointer gap-3 rounded-xl border-[1.5px] p-3 text-sm has-[:focus-visible]:ring-2 ${
                    kind === k.value ? "border-primary bg-primary/10" : "bg-muted/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="kindChoice"
                    value={k.value}
                    checked={kind === k.value}
                    required
                    onChange={() => {
                      setKind(k.value);
                      // Groupe / individuel par défaut, sauf une évaluation déjà notée (figé).
                      if (k.individualOnly) setGroupGrade(false);
                      else if (!assessment) setGroupGrade(k.defaultGroup);
                    }}
                    className="accent-primary mt-0.5 size-4 flex-none"
                  />
                  <span>
                    <span className="block font-semibold">{k.label}</span>
                    <span className="text-muted-foreground block">{k.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {kind ? <input type="hidden" name="kind" value={kind} /> : null}
          <input type="hidden" name="type" value={typeText} />
        </fieldset>

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

        <fieldset className="space-y-2" hidden={!!option?.individualOnly}>
          <legend className="text-base font-medium">Type de note</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="isGroupGradeChoice"
                checked={groupGrade}
                onChange={() => setGroupGrade(true)}
              />
              {isReview
                ? "De groupe (un retour par groupe coché)"
                : `Note de groupe (une note par groupe coché, ×${coefficientFor(true)})`}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="isGroupGradeChoice"
                checked={!groupGrade}
                onChange={() => setGroupGrade(false)}
              />
              {isReview ? "Individuel" : `Note individuelle (×${coefficientFor(false)})`}
            </label>
          </div>
          {groupGrade ? <input type="hidden" name="isGroupGrade" value="on" /> : null}
        </fieldset>

        <fieldset className="space-y-4" hidden={!blocks.subject}>
          <legend className="text-base font-medium">Sujet fourni aux étudiant·es</legend>
          <p className="text-muted-foreground text-sm">
            Rien de ce qui touche à tes notes ou au carnet n’apparaît dans le sujet. Les fichiers
            joints se déposent plus bas, au-dessus du bouton Enregistrer, une fois l’évaluation
            créée.
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

          {blocks.deposit ? (
            <div className="space-y-2">
              <Label htmlFor="whereToSubmit">Où rendre</Label>
              <Input
                id="whereToSubmit"
                name="whereToSubmit"
                maxLength={200}
                placeholder="Ex. Moodle, section « Projet »"
                defaultValue={assessment?.where_to_submit ?? ""}
              />
              <FieldError id="whereToSubmit" errors={fe.whereToSubmit} />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="courseId">Séance</Label>
              <select
                id="courseId"
                name="courseId"
                value={courseId}
                onChange={(e) => {
                  const next = e.target.value;
                  setCourseId(next);
                  const d = courses.find((c) => c.id === next)?.session_date;
                  if (d) setDateText(d.slice(0, 10));
                }}
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
              {!courseId ? (
                <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Pas rattachée à une séance : absente de la frise des étudiant·es.
                </p>
              ) : null}
              {dateMismatch ? (
                <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  La date ({formatFr(dateText)}) ne correspond pas à la séance choisie : en
                  enregistrant, elle prendra celle de la séance (
                  {formatFr(selectedCourseDate ?? "")}).
                </p>
              ) : null}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">{frame.dateLabel}</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
              readOnly={!!selectedCourseDate}
              aria-describedby={selectedCourseDate ? "date-hint" : undefined}
            />
            {selectedCourseDate ? (
              <p id="date-hint" className="text-muted-foreground text-sm">
                Date de la séance choisie : elle suit la séance si celle-ci change de date.
              </p>
            ) : null}
          </div>
          <div className="space-y-2" hidden={!blocks.duration}>
            <Label htmlFor="durationMinutes">
              {whereKind === "oral" ? "Durée par groupe (minutes)" : "Durée (minutes)"}
            </Label>
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              value={durationText}
              onChange={(e) => setDurationText(e.target.value)}
            />
          </div>
          {isCheckpoint ? (
            <div className="space-y-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="reviewGraded"
                  checked={reviewGraded}
                  onChange={(e) => setReviewGraded(e.target.checked)}
                />
                Noté
              </label>
              <p className="text-muted-foreground text-sm">
                {reviewGraded
                  ? "Noté : barème, coefficient, moyennes et notes exigées comme une évaluation normale, avec en plus les repères et retours du point d’étape."
                  : "Non noté : seulement des repères et des retours, hors moyenne et hors notes exigées."}
              </p>
              {isReview ? <input type="hidden" name="coefficient" value="1" /> : null}
              <Label htmlFor="reviewForId">Pris en compte dans</Label>
              <select
                id="reviewForId"
                name="reviewForId"
                value={reviewForId}
                onChange={(e) => {
                  setReviewForId(e.target.value);
                  const target = reviewTargets.find((t) => t.id === e.target.value);
                  if (target?.gradingGridId) setGridId(target.gradingGridId);
                  if (target) setGroupGrade(target.isGroup);
                }}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                aria-describedby="reviewForId-hint"
              >
                <option value="">Choisis l’évaluation notée…</option>
                {reviewTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <p id="reviewForId-hint" className="text-muted-foreground text-sm">
                Il reprend la grille de l’évaluation notée : coche ses critères plus bas. Ses
                retours s’affichent dans la correction de cette évaluation.
              </p>
            </div>
          ) : null}
          {isReview ? null : blocks.imposedCoefficient ? (
            <div className="space-y-2">
              <Label htmlFor="coefficient">Coefficient imposé par l’école</Label>
              <Input
                id="coefficient"
                name="coefficient"
                type="number"
                step="0.1"
                min="0.1"
                required
                value={coefficientText}
                onChange={(e) => setCoefficientText(e.target.value)}
                aria-describedby="coefficient-hint"
              />
              <p id="coefficient-hint" className="text-muted-foreground text-sm">
                Il remplace la règle (×{ruleCoefficient}) pour cette note seulement.
              </p>
              <FieldError id="coefficient" errors={fe.coefficient} />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Coefficient</p>
              <p className="text-muted-foreground text-sm">
                ×{ruleCoefficient} : {groupGrade ? "note de groupe" : "note individuelle"}, règle de
                l’école.
              </p>
            </div>
          )}
          <div className={isReview ? "hidden" : "space-y-2 sm:col-span-2"}>
            <Label htmlFor="maxScore">Barème (note sur)</Label>
            <p id="maxScore-hint" className="text-muted-foreground text-sm">
              Laisser vide : total de la grille, ou 20 sans grille. Les moyennes sont toujours
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
          <div className="space-y-2 sm:col-span-2" hidden={!blocks.grid}>
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
          {isCheckpoint && gridCriteria.length > 0 ? (
            <fieldset key={`review-${gridId}`} className="space-y-2 sm:col-span-2">
              <legend className="text-sm leading-none font-medium">
                Critères commentés dans ce point d’étape
              </legend>
              <p className="text-muted-foreground text-sm">
                Tous cochés : toute la grille. Décoche ceux qui ne sont pas encore abordés.
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {gridCriteria.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="reviewCriterionIds"
                        value={c.id}
                        defaultChecked={reviewSelected.size === 0 || reviewSelected.has(c.id)}
                      />
                      {c.label}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : null}
          {!isReview && blocks.grid && gridCriteria.length > 0 ? (
            <fieldset key={gridId} className="space-y-2 sm:col-span-2">
              <legend className="text-sm leading-none font-medium">
                Critères validés d’office pour cette évaluation
              </legend>
              <p className="text-muted-foreground text-sm">
                Un critère validé d’office reçoit son palier le plus haut sans saisie (ex. déjà
                validé lors d’une phase précédente).
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

        <div
          className="space-y-1 rounded-md border border-dashed p-3 text-sm"
          hidden={!blocks.dayJ}
        >
          <p className="text-muted-foreground">{frame.hint}</p>
          {warnings.length > 0 ? (
            <ul role="status" className="list-disc pl-5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <fieldset className="bg-muted/40 space-y-2 rounded-xl border p-4">
          <legend className="px-1 text-base font-medium">Pour toi seule</legend>
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
        </fieldset>

        {!assessment &&
        !isReview &&
        blocks.makeupAndBonus &&
        canPrepareMakeupInAdvance(groupGrade, false) ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="prepareMakeup" />
            Préparer dès maintenant le sujet de rattrapage (même grille, même coefficient)
          </label>
        ) : null}
      </form>
      {children}
      <div className="max-w-xl space-y-3">
        {state.error ? <ActionError error={state.error} /> : null}

        <div className="flex gap-3">
          <PendingButton
            type="submit"
            form="assessment-form"
            pending={pending}
            pendingLabel="Enregistrement…"
          >
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
      </div>
    </>
  );
}
