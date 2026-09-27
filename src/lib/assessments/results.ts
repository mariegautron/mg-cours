import { gradingTargets } from "@/lib/assessments/targets";
import { criteriaTotal, effectiveMaxScore, toTwenty } from "@/lib/ynov/notation";
import type { Tables } from "@/types/db";

export interface ResultCriterionLine {
  label: string;
  points: number | null;
  max: number;
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
  feedback: string | null;
  comments: string[];
}

interface Input {
  moduleName: string;
  assessment: Pick<
    Tables<"assessment">,
    "title" | "subject" | "date" | "is_group_grade" | "max_score"
  >;
  groups: { id: string; name: string; members: Tables<"student">[] }[];
  criteria: Pick<Tables<"grid_criterion">, "id" | "label" | "weight">[];
  grades: Tables<"grade">[];
  comments: Pick<Tables<"predefined_comment">, "id" | "text">[];
}

/**
 * Construit une fiche de résultat par note : note de groupe = 1 fiche par groupe noté (destinataires :
 * ses membres), note individuelle = 1 fiche par étudiant·e noté·e (sans doublon entre groupes).
 */
export function buildResultSheets(input: Input): ResultSheet[] {
  const { assessment, criteria, comments } = input;
  const commentText = new Map(comments.map((c) => [c.id, c.text]));
  const maxScore = effectiveMaxScore(assessment.max_score, criteriaTotal(criteria));

  const sheetFor = (grade: Tables<"grade">, recipients: ResultSheet["recipients"]): ResultSheet => {
    const scores = (grade.scores ?? {}) as Record<string, number>;
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
      criteria: criteria.map((c) => ({
        label: c.label,
        points: scores[c.id] ?? null,
        max: c.weight,
      })),
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
