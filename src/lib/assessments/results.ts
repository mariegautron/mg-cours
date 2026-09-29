import { gradingTargets } from "@/lib/assessments/targets";
import { parseCriterionComments } from "@/lib/assessments/feedback";
import { findLevel } from "@/lib/assessments/levels";
import {
  computeTotals,
  describeOverflow,
  effectivePoints,
  groupByAxis,
  type AxisSubtotal,
} from "@/lib/assessments/scoring";
import { criteriaTotal, effectiveMaxScore, toTwenty } from "@/lib/ynov/notation";
import type { Tables } from "@/types/db";

export interface ResultCriterionLine {
  label: string;
  /** `null` : critère pas encore noté. Validé d'office : son barème. */
  points: number | null;
  max: number;
  /** Nom de l'axe, `null` sans axe. */
  axis: string | null;
  reference: string | null;
  isBonus: boolean;
  autoValidated: boolean;
  /** Palier obtenu (points + description) quand le critère a des paliers et que la note en fait partie. */
  level: { points: number; description: string } | null;
  /** Commentaire du critère. */
  comment: string | null;
}

export interface ResultAxisSubtotal extends Omit<AxisSubtotal, "axisId"> {
  label: string | null;
}

export interface ResultSheet {
  /** Destinataires (1 pour une note individuelle, tous les membres pour une note de groupe). */
  recipients: { name: string; email: string | null }[];
  title: string;
  isGroupGrade: boolean;
  /** Sujet complet (Markdown). */
  subject: string | null;
  moduleName: string;
  date: string | null;
  value: number | null;
  /** Barème effectif de l'évaluation. */
  maxScore: number;
  /** Note ramenée sur 20 (moyennes YNOV / Hyperplanning). */
  valueOn20: number | null;
  criteria: ResultCriterionLine[];
  /** Sous-totaux par axe (un seul élément sans axe défini). */
  axes: ResultAxisSubtotal[];
  /** Ex. « 20,33 → plafonné à 20 » si le bonus a fait dépasser le barème. */
  overflow: string | null;
  /** Points forts. */
  strengths: string | null;
  /** Progrès. */
  progress: string | null;
  /** Commentaire libre. */
  feedback: string | null;
  /** Anciennes phrases liées par identifiant (avant US-84) : lecture seule. */
  comments: string[];
}

interface Input {
  moduleName: string;
  assessment: Pick<
    Tables<"assessment">,
    "title" | "subject" | "date" | "is_group_grade" | "max_score"
  > &
    Partial<Pick<Tables<"assessment">, "auto_validated_criterion_ids">>;
  groups: { id: string; name: string; members: Tables<"student">[] }[];
  criteria: (Pick<Tables<"grid_criterion">, "id" | "label" | "weight"> &
    Partial<Pick<Tables<"grid_criterion">, "axis_id" | "reference" | "is_bonus">> & {
      levels?: { points: number; description: string }[];
    })[];
  /** Axes de la grille, dans l'ordre. */
  axes?: Pick<Tables<"grid_axis">, "id" | "label">[];
  grades: Tables<"grade">[];
  comments: Pick<Tables<"predefined_comment">, "id" | "text">[];
}

/**
 * Construit une fiche de résultat par note : note de groupe = 1 fiche par groupe noté (destinataires :
 * ses membres), note individuelle = 1 fiche par étudiant·e noté·e (sans doublon entre groupes).
 */
export function buildResultSheets(input: Input): ResultSheet[] {
  const { assessment, comments } = input;
  const axes = input.axes ?? [];
  const groups = groupByAxis(input.criteria, axes);
  const criteria = groups.flatMap((g) => g.criteria);
  const axisLabel = new Map(axes.map((a) => [a.id, a.label]));
  const autoValidatedIds = assessment.auto_validated_criterion_ids ?? [];
  const scoringCriteria = criteria.map((c) => ({
    id: c.id,
    weight: c.weight,
    axisId: c.axis_id ?? null,
    isBonus: c.is_bonus ?? false,
  }));
  const commentText = new Map(comments.map((c) => [c.id, c.text]));
  const maxScore = effectiveMaxScore(assessment.max_score, criteriaTotal(criteria));

  const sheetFor = (grade: Tables<"grade">, recipients: ResultSheet["recipients"]): ResultSheet => {
    const scores = (grade.scores ?? {}) as Record<string, number>;
    const totals = computeTotals(scoringCriteria, scores, {
      autoValidatedIds,
      maxScore: assessment.max_score,
    });
    // Le dépassement n'est affiché que si la note enregistrée est bien celle qu'on recalcule
    // (la grille a pu être modifiée depuis la saisie).
    const criterionComments = parseCriterionComments(grade.criterion_comments);
    const consistent = grade.value !== null && Math.abs(totals.value - grade.value) < 0.01;
    return {
      recipients,
      title: assessment.title,
      isGroupGrade: assessment.is_group_grade,
      subject: assessment.subject,
      moduleName: input.moduleName,
      date: assessment.date,
      value: grade.value,
      maxScore,
      valueOn20: grade.value === null ? null : toTwenty(grade.value, maxScore),
      criteria: criteria.map((c, i) => {
        const autoValidated = !c.is_bonus && autoValidatedIds.includes(c.id);
        return {
          label: c.label,
          points:
            autoValidated || scores[c.id] !== undefined
              ? effectivePoints(scoringCriteria[i], scores, autoValidatedIds)
              : null,
          max: c.weight,
          axis: c.axis_id ? (axisLabel.get(c.axis_id) ?? null) : null,
          reference: c.reference ?? null,
          isBonus: c.is_bonus ?? false,
          autoValidated,
          level: findLevel(c.levels ?? [], autoValidated ? c.weight : scores[c.id]),
          comment: criterionComments[c.id] ?? null,
        };
      }),
      axes: totals.axes.map(({ axisId, ...a }) => ({
        ...a,
        label: axisId ? (axisLabel.get(axisId) ?? null) : null,
      })),
      overflow: consistent ? describeOverflow(totals) : null,
      strengths: grade.strengths ?? null,
      progress: grade.progress ?? null,
      feedback: grade.feedback,
      comments: grade.predefined_comment_ids
        .map((id) => commentText.get(id))
        .filter((t): t is string => !!t),
    };
  };

  const recipient = (m: Tables<"student">) => ({
    name: `${m.first_name} ${m.last_name}`,
    email: m.email,
  });
  const targets = gradingTargets(assessment.is_group_grade, input.groups);

  if (assessment.is_group_grade) {
    return targets.flatMap(({ group }) => {
      const grade = input.grades.find((g) => g.student_group_id === group.id && g.value !== null);
      return grade ? [sheetFor(grade, group.members.map(recipient))] : [];
    });
  }

  return targets
    .flatMap((t) => t.students)
    .flatMap((m) => {
      const grade = input.grades.find((g) => g.student_id === m.id && g.value !== null);
      return grade ? [sheetFor(grade, [recipient(m)])] : [];
    });
}

export interface ResultsRecipients {
  /** Adresses e-mail distinctes qui recevront un message. */
  emails: number;
  /** Étudiant·es sans e-mail, dans l'ordre des fiches (sans doublon). */
  withoutEmail: string[];
}

/** Destinataires d'un envoi des résultats, affichés avant confirmation (US-76). */
export function resultsRecipients(sheets: Pick<ResultSheet, "recipients">[]): ResultsRecipients {
  const emails = new Set<string>();
  const withoutEmail: string[] = [];
  for (const sheet of sheets) {
    for (const r of sheet.recipients) {
      if (r.email) emails.add(r.email.toLowerCase());
      else if (!withoutEmail.includes(r.name)) withoutEmail.push(r.name);
    }
  }
  return { emails: emails.size, withoutEmail };
}
