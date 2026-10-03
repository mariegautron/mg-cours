/**
 * US-148 : écran « Rattrapages » du module. Fonction pure : pour chaque évaluation INDIVIDUELLE
 * (jamais une note de groupe, jamais un rattrapage), qui est absent·e excusé·e et où en est son
 * rattrapage. La note de rattrapage remplace l'absence dans les moyennes (flux US-96).
 */
export type MakeupStep = "to_prepare" | "to_enroll" | "to_grade" | "done";

export const MAKEUP_STEP_LABELS: Record<MakeupStep, string> = {
  to_prepare: "Sujet à préparer",
  to_enroll: "À inscrire au rattrapage",
  to_grade: "Note à saisir",
  done: "Note remplacée",
};

export interface OverviewAssessment {
  id: string;
  title: string;
  is_group_grade: boolean;
  makeup_of_id: string | null;
}

export interface OverviewGrade {
  assessment_id: string;
  student_id: string | null;
  attendance: string;
  value: number | null;
}

export interface MakeupRow {
  student: { id: string; name: string };
  step: MakeupStep;
}

export interface MakeupGroup {
  assessment: OverviewAssessment;
  /** Rattrapage déjà préparé pour cette évaluation. */
  makeup: { id: string; title: string } | null;
  rows: MakeupRow[];
}

export function makeupOverview(input: {
  assessments: readonly OverviewAssessment[];
  grades: readonly OverviewGrade[];
  /** Étudiant·es inscrit·es à chaque rattrapage (clé : id du rattrapage). */
  enrolled: ReadonlyMap<string, readonly string[]>;
  studentNames: ReadonlyMap<string, string>;
}): MakeupGroup[] {
  const makeupOf = new Map(
    input.assessments.filter((a) => a.makeup_of_id).map((a) => [a.makeup_of_id as string, a]),
  );
  const groups: MakeupGroup[] = [];
  for (const a of input.assessments) {
    if (a.is_group_grade || a.makeup_of_id) continue;
    const excused = [
      ...new Set(
        input.grades
          .filter(
            (g) => g.assessment_id === a.id && g.attendance === "absent_excused" && g.student_id,
          )
          .map((g) => g.student_id as string),
      ),
    ];
    if (excused.length === 0) continue;
    const makeup = makeupOf.get(a.id) ?? null;
    const enrolled = new Set(makeup ? (input.enrolled.get(makeup.id) ?? []) : []);
    const rows = excused
      .map((id): MakeupRow => {
        let step: MakeupStep;
        if (!makeup) step = "to_prepare";
        else if (!enrolled.has(id)) step = "to_enroll";
        else {
          const graded = input.grades.some(
            (g) => g.assessment_id === makeup.id && g.student_id === id && g.value !== null,
          );
          step = graded ? "done" : "to_grade";
        }
        return { student: { id, name: input.studentNames.get(id) ?? "Étudiant·e" }, step };
      })
      .sort((x, y) => x.student.name.localeCompare(y.student.name, "fr"));
    groups.push({
      assessment: a,
      makeup: makeup ? { id: makeup.id, title: makeup.title } : null,
      rows,
    });
  }
  return groups;
}

/** « 2 à rattraper, 1 note remplacée ». */
export function makeupSummary(groups: readonly MakeupGroup[]): string {
  const rows = groups.flatMap((g) => g.rows);
  const done = rows.filter((r) => r.step === "done").length;
  const open = rows.length - done;
  if (rows.length === 0) return "Personne à rattraper.";
  return `${open} à rattraper, ${done} note${done > 1 ? "s" : ""} remplacée${done > 1 ? "s" : ""}.`;
}
