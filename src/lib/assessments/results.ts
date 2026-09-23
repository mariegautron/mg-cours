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
  subjectName: string | null;
  moduleName: string;
  date: string | null;
  value: number | null;
  maxScore: number | null;
  criteria: ResultCriterionLine[];
  feedback: string | null;
  comments: string[];
}

interface Input {
  moduleName: string;
  assessment: Pick<Tables<"assessment">, "title" | "subject" | "date" | "is_group_grade">;
  group: { name: string; members: Tables<"student">[] };
  criteria: Pick<Tables<"grid_criterion">, "id" | "label" | "weight">[];
  grades: Tables<"grade">[];
  comments: Pick<Tables<"predefined_comment">, "id" | "text">[];
}

/** Construit une fiche de résultat par note (groupe = 1 fiche, individuelle = 1 par étudiant·e noté·e). */
export function buildResultSheets(input: Input): ResultSheet[] {
  const { assessment, group, criteria, comments } = input;
  const commentText = new Map(comments.map((c) => [c.id, c.text]));
  const maxScore = criteria.length ? criteria.reduce((s, c) => s + c.weight, 0) : null;

  const sheetFor = (grade: Tables<"grade">, recipients: ResultSheet["recipients"]): ResultSheet => {
    const scores = (grade.scores ?? {}) as Record<string, number>;
    return {
      recipients,
      title: assessment.title,
      isGroupGrade: assessment.is_group_grade,
      subjectName: assessment.subject,
      moduleName: input.moduleName,
      date: assessment.date,
      value: grade.value,
      maxScore,
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

  if (assessment.is_group_grade) {
    const grade = input.grades.find((g) => g.student_group_id !== null && g.value !== null);
    if (!grade) return [];
    return [
      sheetFor(
        grade,
        group.members.map((m) => ({ name: `${m.first_name} ${m.last_name}`, email: m.email })),
      ),
    ];
  }

  return group.members.flatMap((m) => {
    const grade = input.grades.find((g) => g.student_id === m.id && g.value !== null);
    return grade
      ? [sheetFor(grade, [{ name: `${m.first_name} ${m.last_name}`, email: m.email }])]
      : [];
  });
}
