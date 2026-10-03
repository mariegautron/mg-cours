/**
 * US-161 : indicateurs discrets d'une tuile d'étudiant·e. Fonctions pures.
 * - Appréciation : « écrite » quand chaque module de la personne a la sienne, « à écrire » sinon.
 * - Rendu à corriger : un rendu déposé pour une évaluation qui n'a pas encore de note pour elle.
 */

export interface IndicatorInput {
  /** Modules où la personne est dans un groupe. */
  modules: number;
  /** Modules pour lesquels une appréciation est écrite. */
  appreciated: number;
  /** Évaluations avec un rendu mais sans note pour la personne. */
  toGrade: number;
  /** Les appréciations existent-elles (table présente) ? Sinon l'indicateur n'est pas affiché. */
  appreciationsAvailable: boolean;
}

export interface Indicator {
  key: "appreciation_written" | "appreciation_missing" | "to_grade";
  label: string;
}

export function studentIndicators(i: IndicatorInput): Indicator[] {
  const out: Indicator[] = [];
  if (i.appreciationsAvailable && i.modules > 0) {
    out.push(
      i.appreciated >= i.modules
        ? { key: "appreciation_written", label: "Appréciation écrite" }
        : { key: "appreciation_missing", label: "Appréciation à écrire" },
    );
  }
  if (i.toGrade > 0) {
    out.push({
      key: "to_grade",
      label: i.toGrade === 1 ? "1 rendu à corriger" : `${i.toGrade} rendus à corriger`,
    });
  }
  return out;
}

export interface SubmissionRef {
  assessmentId: string;
  studentId: string | null;
  groupId: string | null;
}

export interface GradeRef {
  assessmentId: string;
  studentId: string | null;
  groupId: string | null;
  value: number | null;
}

/**
 * Pour chaque étudiant·e, les évaluations qui ont un rendu (le sien, ou celui de son groupe) mais
 * aucune note la concernant (note individuelle, ou note de son groupe).
 */
export function pendingByStudent(
  submissions: readonly SubmissionRef[],
  grades: readonly GradeRef[],
  membersByGroup: ReadonlyMap<string, readonly string[]>,
): Map<string, Set<string>> {
  const gradedStudent = new Set(
    grades
      .filter((g) => g.studentId && g.value !== null)
      .map((g) => `${g.assessmentId}|${g.studentId}`),
  );
  const gradedGroup = new Set(
    grades
      .filter((g) => g.groupId && g.value !== null)
      .map((g) => `${g.assessmentId}|${g.groupId}`),
  );
  const pending = new Map<string, Set<string>>();
  const add = (student: string, assessment: string) => {
    const set = pending.get(student) ?? new Set<string>();
    set.add(assessment);
    pending.set(student, set);
  };
  for (const s of submissions) {
    if (s.studentId) {
      if (!gradedStudent.has(`${s.assessmentId}|${s.studentId}`)) add(s.studentId, s.assessmentId);
    } else if (s.groupId) {
      const groupGraded = gradedGroup.has(`${s.assessmentId}|${s.groupId}`);
      for (const m of membersByGroup.get(s.groupId) ?? []) {
        if (!groupGraded && !gradedStudent.has(`${s.assessmentId}|${m}`)) add(m, s.assessmentId);
      }
    }
  }
  return pending;
}

export type StudentView = "tiles" | "list";

export function readView(value: unknown): StudentView {
  return value === "list" ? "list" : "tiles";
}
