import { saveGroupGrade, saveStudentGrade } from "@/app/(app)/modules/[id]/assessments/actions";
import type { SessionSection } from "@/components/assessments/grading-session";
import type { AssessmentDetail } from "@/lib/assessments/queries";
import { observationsForCopy, type ObservationLine } from "@/lib/assessments/session";
import { gradingTargets } from "@/lib/assessments/targets";
import { OBSERVATION_TAG_LABELS } from "@/lib/notebook/notebook";
import type { ModuleObservation } from "@/lib/notebook/queries";
import type { Tables } from "@/types/db";

/** Observations du carnet (privées) mises en forme pour la correction : consultables, jamais exportées. */
export function toObservationLines(rows: ModuleObservation[]): ObservationLine[] {
  return rows.map((o) => ({
    id: o.id,
    studentId: o.student_id,
    studentName: o.student ? `${o.student.first_name} ${o.student.last_name}` : "",
    tag: OBSERVATION_TAG_LABELS[o.tag] ?? o.tag,
    note: o.note,
    createdAt: o.created_at,
  }));
}

/**
 * Copies à corriger d'une évaluation : une par groupe (note de groupe, avec ajustements individuels)
 * ou une par étudiant·e sous chaque groupe. Partagé par la page de l'évaluation et l'écran d'oral,
 * pour ne pas dupliquer la logique de correction.
 */
export function buildSessionSections({
  moduleId,
  assessment,
  grades,
  overrideRows,
  observations,
  themes,
}: {
  moduleId: string;
  assessment: AssessmentDetail;
  grades: Tables<"grade">[];
  overrideRows: Tables<"group_grade_member">[];
  observations: ObservationLine[];
  /** Titre du thème de chaque groupe (identifiant de groupe → titre). */
  themes: Record<string, string>;
}): SessionSection[] {
  const assessmentId = assessment.id;
  const targets = gradingTargets(assessment.is_group_grade, assessment.groups);
  if (assessment.is_group_grade) {
    return [
      {
        id: "groups",
        title: null,
        items: targets.map(({ group }) => ({
          id: group.id,
          title: `Note du groupe « ${group.name} »`,
          action: saveGroupGrade.bind(null, moduleId, assessmentId, group.id),
          theme: themes[group.id] ?? null,
          grade: grades.find((g) => g.student_group_id === group.id),
          observations: observationsForCopy(
            group.members.map((m) => m.id),
            observations,
          ),
          members: group.members.map((m) => ({
            id: m.id,
            name: `${m.first_name} ${m.last_name}`,
          })),
          memberOverrides: Object.fromEntries(
            overrideRows
              .filter((o) => o.grade_id === grades.find((g) => g.student_group_id === group.id)?.id)
              .map((o) => [
                o.student_id,
                {
                  attendance: o.attendance,
                  factor: o.individual_factor,
                  justification: o.justification,
                },
              ]),
          ),
        })),
      },
    ];
  }
  return targets.map(({ group, students }) => ({
    id: group.id,
    title: group.name,
    empty:
      group.members.length === 0
        ? "Ce groupe n’a aucun membre pour l’instant."
        : "Membres déjà notés dans un autre groupe ci-dessus.",
    items: students.map((m) => ({
      id: m.id,
      title: `${m.first_name} ${m.last_name}`,
      action: saveStudentGrade.bind(null, moduleId, assessmentId, m.id),
      theme: themes[group.id] ?? null,
      grade: grades.find((g) => g.student_id === m.id),
      observations: observationsForCopy([m.id], observations),
    })),
  }));
}
