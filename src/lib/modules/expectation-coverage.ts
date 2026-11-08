/**
 * Couverture des attendus par les cours ET par les évaluations. Fonctions pures : pour chaque
 * attendu de la fiche école, quels cours et quelles évaluations le couvrent ; ceux qu'aucun ne
 * couvre sont signalés. Sert à la vue « Couverture des attendus » et à la progression pédagogique.
 */
export interface CoverageExpectation {
  id: string;
  label: string;
}

export interface CoverageRef {
  id: string;
  title: string;
}

export type ExpectationCoverageState = "both" | "course" | "assessment" | "none";

export interface ExpectationCoverageRow {
  id: string;
  label: string;
  courses: CoverageRef[];
  assessments: CoverageRef[];
  state: ExpectationCoverageState;
}

export interface ExpectationCoverageSummary {
  total: number;
  /** Couverts par au moins un cours. */
  byCourse: number;
  /** Couverts par au moins une évaluation. */
  byAssessment: number;
  /** Couverts par ni l'un ni l'autre. */
  byNone: number;
}

export function buildExpectationCoverage(input: {
  expectations: readonly CoverageExpectation[];
  courses: readonly CoverageRef[];
  assessments: readonly CoverageRef[];
  /** attendu → identifiants de cours */
  coursesByExpectation: ReadonlyMap<string, readonly string[]>;
  /** attendu → identifiants d'évaluations */
  assessmentsByExpectation: ReadonlyMap<string, readonly string[]>;
}): { rows: ExpectationCoverageRow[]; summary: ExpectationCoverageSummary } {
  const courseById = new Map(input.courses.map((c) => [c.id, c]));
  const assessmentById = new Map(input.assessments.map((a) => [a.id, a]));
  const rows = input.expectations.map((e): ExpectationCoverageRow => {
    const courses = (input.coursesByExpectation.get(e.id) ?? []).flatMap((id) => {
      const c = courseById.get(id);
      return c ? [c] : [];
    });
    const assessments = (input.assessmentsByExpectation.get(e.id) ?? []).flatMap((id) => {
      const a = assessmentById.get(id);
      return a ? [a] : [];
    });
    const state: ExpectationCoverageState =
      courses.length && assessments.length
        ? "both"
        : courses.length
          ? "course"
          : assessments.length
            ? "assessment"
            : "none";
    return { id: e.id, label: e.label, courses, assessments, state };
  });
  return {
    rows,
    summary: {
      total: rows.length,
      byCourse: rows.filter((r) => r.courses.length > 0).length,
      byAssessment: rows.filter((r) => r.assessments.length > 0).length,
      byNone: rows.filter((r) => r.state === "none").length,
    },
  };
}

const fold = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Numéro de bloc / compétence cité (« Bloc 2 », « B2 », « C3 »), sinon `null`. */
function blockKey(text: string): string | null {
  const m = fold(text).match(/\b(?:bloc|b|competence|c)\s?(\d+)\b/);
  return m ? m[1] : null;
}

/**
 * Attendus cités par les critères d'une grille : la référence du critère (texte libre, ou nom d'un
 * attendu) est rapprochée du libellé de l'attendu — contenu l'un dans l'autre, ou même numéro de bloc.
 */
export function expectationsCitedByCriteria(
  references: readonly (string | null | undefined)[],
  expectations: readonly CoverageExpectation[],
): string[] {
  const refs = references.map((r) => (r ?? "").trim()).filter(Boolean);
  if (refs.length === 0) return [];
  const out = new Set<string>();
  for (const e of expectations) {
    const label = fold(e.label);
    const labelBlock = blockKey(e.label);
    for (const ref of refs) {
      const f = fold(ref);
      if (!f) continue;
      const refBlock = blockKey(ref);
      if (
        label.includes(f) ||
        (f.length >= 6 && f.includes(label)) ||
        (refBlock !== null && refBlock === labelBlock)
      ) {
        out.add(e.id);
        break;
      }
    }
  }
  return [...out];
}

export const COVERAGE_STATE_LABELS: Record<ExpectationCoverageState, string> = {
  both: "Cours et évaluation",
  course: "Cours seulement",
  assessment: "Évaluation seulement",
  none: "Aucun cours ni évaluation",
};
