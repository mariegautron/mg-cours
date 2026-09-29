import { groupMemberValue, type MemberOverride } from "@/lib/assessments/attendance";
import { createClient } from "@/lib/supabase/server";
import {
  criteriaTotal,
  effectiveMaxScore,
  noteProgress,
  weightedAverage,
  type GradeInput,
  type NoteProgress,
} from "@/lib/ynov/notation";
import type { Tables } from "@/types/db";

export type CriterionWithLevels = Tables<"grid_criterion"> & {
  /** Paliers du plus haut au plus bas (vide : saisie numérique libre). */
  levels: Tables<"criterion_level">[];
};

export interface GridWithCriteria extends Tables<"grading_grid"> {
  /** Critères dans l'ordre de la grille. */
  criteria: CriterionWithLevels[];
  /** Axes dans l'ordre de la grille (vide : critères sans axe). */
  axes: Tables<"grid_axis">[];
}

type RawCriterion = Tables<"grid_criterion"> & { criterion_level: Tables<"criterion_level">[] };

function toAxes(raw: Tables<"grid_axis">[] | null | undefined): Tables<"grid_axis">[] {
  return [...(raw ?? [])].sort((a, b) => a.position - b.position);
}

function toCriteria(raw: RawCriterion[]): CriterionWithLevels[] {
  return raw
    .map(({ criterion_level, ...c }) => ({
      ...c,
      levels: [...criterion_level].sort((a, b) => b.points - a.points),
    }))
    .sort((a, b) => a.position - b.position);
}

export async function listGrids(): Promise<GridWithCriteria[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grading_grid")
    .select("*, grid_criterion(*, criterion_level(*)), grid_axis(*)")
    .order("name");

  return (data ?? []).map((g) => {
    const { grid_criterion, grid_axis, ...grid } = g as unknown as Tables<"grading_grid"> & {
      grid_criterion: RawCriterion[];
      grid_axis: Tables<"grid_axis">[];
    };
    return { ...grid, criteria: toCriteria(grid_criterion), axes: toAxes(grid_axis) };
  });
}

export async function getGrid(id: string): Promise<GridWithCriteria | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grading_grid")
    .select("*, grid_criterion(*, criterion_level(*)), grid_axis(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { grid_criterion, grid_axis, ...grid } = data as unknown as Tables<"grading_grid"> & {
    grid_criterion: RawCriterion[];
    grid_axis: Tables<"grid_axis">[];
  };
  return { ...grid, criteria: toCriteria(grid_criterion), axes: toAxes(grid_axis) };
}

export interface CommentFilters {
  q?: string;
  category?: string;
  tag?: string;
}

export async function listComments(
  filters: CommentFilters = {},
): Promise<Tables<"predefined_comment">[]> {
  const supabase = await createClient();
  let query = supabase
    .from("predefined_comment")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.q) query = query.ilike("text", `%${filters.q}%`);
  if (filters.category)
    query = query.eq("category", filters.category as Tables<"predefined_comment">["category"]);
  if (filters.tag) query = query.contains("tags", [filters.tag]);
  const { data } = await query;
  return data ?? [];
}

export async function getComment(id: string): Promise<Tables<"predefined_comment"> | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("predefined_comment").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function commentTags(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("predefined_comment").select("tags");
  const set = new Set((data ?? []).flatMap((r) => r.tags));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}

type GroupRef = Pick<Tables<"student_group">, "id" | "name">;

export interface AssessmentWithMeta extends Tables<"assessment"> {
  /** Groupes visés, triés par nom. */
  groups: GroupRef[];
  grading_grid: Pick<Tables<"grading_grid">, "id" | "name"> | null;
  /** Barème effectif (saisi, sinon total de la grille, sinon 20). */
  maxScore: number;
  gradeCount: number;
}

const LIST_SELECT =
  "*, assessment_group(student_group:student_group_id(id, name)), grading_grid:grading_grid_id(id, name, grid_criterion(weight, is_bonus))";

type RawListed = Tables<"assessment"> & {
  assessment_group: { student_group: GroupRef | null }[];
  grading_grid:
    | (Pick<Tables<"grading_grid">, "id" | "name"> & {
        grid_criterion: { weight: number; is_bonus: boolean }[];
      })
    | null;
};

function byName<T extends { name: string }>(a: T, b: T) {
  return a.name.localeCompare(b.name, "fr");
}

function flattenGroups<T extends RawListed>(
  rows: T[],
): (Omit<T, "assessment_group" | "grading_grid"> & {
  groups: GroupRef[];
  grading_grid: Pick<Tables<"grading_grid">, "id" | "name"> | null;
  maxScore: number;
})[] {
  return rows.map(({ assessment_group, grading_grid, ...a }) => ({
    ...a,
    grading_grid: grading_grid ? { id: grading_grid.id, name: grading_grid.name } : null,
    maxScore: effectiveMaxScore(a.max_score, criteriaTotal(grading_grid?.grid_criterion ?? [])),
    groups: assessment_group
      .map((ag) => ag.student_group)
      .filter((g): g is GroupRef => g !== null)
      .sort(byName),
  }));
}

async function attachGradeCounts<T extends { id: string }>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessments: T[],
): Promise<(T & { gradeCount: number })[]> {
  if (assessments.length === 0) return [];
  const { data: grades } = await supabase
    .from("grade")
    .select("assessment_id, value")
    .in(
      "assessment_id",
      assessments.map((a) => a.id),
    );

  const counts = new Map<string, number>();
  for (const g of grades ?? []) {
    if (g.value === null) continue;
    counts.set(g.assessment_id, (counts.get(g.assessment_id) ?? 0) + 1);
  }

  return assessments.map((a) => ({ ...a, gradeCount: counts.get(a.id) ?? 0 }));
}

export async function listModuleAssessments(moduleId: string): Promise<AssessmentWithMeta[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment")
    .select(LIST_SELECT)
    .eq("module_id", moduleId)
    .order("date", { ascending: false, nullsFirst: false });

  return attachGradeCounts(supabase, flattenGroups((data ?? []) as unknown as RawListed[]));
}

export async function listAllAssessments(): Promise<
  (AssessmentWithMeta & { module: Pick<Tables<"module">, "id" | "name" | "year"> | null })[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment")
    .select(`${LIST_SELECT}, module:module_id(id, name, year)`)
    .order("date", { ascending: false, nullsFirst: false });

  return attachGradeCounts(
    supabase,
    flattenGroups(
      (data ?? []) as unknown as (RawListed & {
        module: Pick<Tables<"module">, "id" | "name" | "year"> | null;
      })[],
    ),
  );
}

export type GroupWithMembers = Tables<"student_group"> & { members: Tables<"student">[] };

export interface AssessmentDetail extends Tables<"assessment"> {
  /** Groupes visés (triés par nom) avec leurs membres. */
  groups: GroupWithMembers[];
  grading_grid: GridWithCriteria | null;
  /** Barème effectif (saisi, sinon total de la grille, sinon 20). */
  maxScore: number;
}

export async function getAssessment(id: string): Promise<AssessmentDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment")
    .select(
      "*, assessment_group(student_group:student_group_id(*, group_member(student:student_id(*)))), grading_grid:grading_grid_id(*, grid_criterion(*, criterion_level(*)), grid_axis(*))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { assessment_group, ...raw } = data as unknown as Tables<"assessment"> & {
    assessment_group: {
      student_group:
        | (Tables<"student_group"> & { group_member: { student: Tables<"student"> | null }[] })
        | null;
    }[];
    grading_grid:
      | (Tables<"grading_grid"> & {
          grid_criterion: RawCriterion[];
          grid_axis: Tables<"grid_axis">[];
        })
      | null;
  };

  const groups = assessment_group
    .map((ag) => ag.student_group)
    .filter((g) => g !== null)
    .map(({ group_member, ...g }) => ({
      ...g,
      members: group_member.map((m) => m.student).filter((s) => s !== null),
    }))
    .sort(byName);

  const grading_grid: GridWithCriteria | null = raw.grading_grid
    ? (({ grid_criterion, grid_axis, ...grid }) => ({
        ...grid,
        criteria: toCriteria(grid_criterion),
        axes: toAxes(grid_axis),
      }))(raw.grading_grid)
    : null;

  const maxScore = effectiveMaxScore(raw.max_score, criteriaTotal(grading_grid?.criteria ?? []));

  // Un rattrapage ne concerne que les absent·es excusé·es qui y sont inscrit·es (US-96).
  if (raw.makeup_of_id) {
    const { data: enrolled } = await supabase
      .from("assessment_student")
      .select("student_id")
      .eq("assessment_id", id);
    const ids = new Set((enrolled ?? []).map((e) => e.student_id));
    return {
      ...raw,
      groups: groups.map((g) => ({ ...g, members: g.members.filter((m) => ids.has(m.id)) })),
      grading_grid,
      maxScore,
    };
  }

  return { ...raw, groups, grading_grid, maxScore };
}

/** Ajustements individuels (absence, pondération) des notes de groupe données. */
export async function listGroupGradeMembers(
  gradeIds: string[],
): Promise<Tables<"group_grade_member">[]> {
  if (gradeIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("group_grade_member").select("*").in("grade_id", gradeIds);
  return data ?? [];
}

export async function getGradesByAssessment(assessmentId: string): Promise<Tables<"grade">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("grade").select("*").eq("assessment_id", assessmentId);
  return data ?? [];
}

/**
 * Progression des notes requises pour un module (US-11/US-27) : compte, par type
 * (groupe/individuelle), le nombre d'évaluations ayant au moins une note saisie —
 * c'est le sens YNOV de « note » (1 évaluation = 1 note), pas le nombre de lignes
 * `grade` (une évaluation individuelle produit N lignes, une par étudiant·e).
 */
/** `assessments` : liste déjà chargée par l'appelant, pour éviter une seconde requête. */
export async function moduleNoteProgress(
  moduleId: string,
  totalHours: number,
  loaded?: AssessmentWithMeta[],
): Promise<NoteProgress> {
  const assessments = loaded ?? (await listModuleAssessments(moduleId));
  // Un rattrapage remplace l'absence excusée de l'original : il ne compte pas comme une note de plus.
  const counted = assessments.filter((a) => !a.makeup_of_id);
  const group = counted.filter((a) => a.is_group_grade && a.gradeCount > 0).length;
  const individual = counted.filter((a) => !a.is_group_grade && a.gradeCount > 0).length;
  return noteProgress(totalHours, { group, individual });
}

export interface StudentAverage {
  student: Tables<"student">;
  average: ReturnType<typeof weightedAverage>;
}

/** Moyenne pondérée YNOV sur 20 (groupe ×1, individuel ×3) de chaque étudiant·e du module. */
export async function moduleStudentAverages(moduleId: string): Promise<StudentAverage[]> {
  const supabase = await createClient();
  const [{ data: groups }, assessments] = await Promise.all([
    supabase
      .from("student_group")
      .select("id, group_member(student:student_id(*))")
      .eq("module_id", moduleId),
    listModuleAssessments(moduleId),
  ]);

  const studentsByGroup = new Map<string, Tables<"student">[]>();
  const allStudents = new Map<string, Tables<"student">>();
  for (const g of (groups ?? []) as unknown as {
    id: string;
    group_member: { student: Tables<"student"> | null }[];
  }[]) {
    const members = g.group_member
      .map((m) => m.student)
      .filter((s): s is Tables<"student"> => s !== null);
    studentsByGroup.set(g.id, members);
    for (const s of members) allStudents.set(s.id, s);
  }

  if (assessments.length === 0 || allStudents.size === 0) return [];

  const { data: grades } = await supabase
    .from("grade")
    .select("*")
    .in(
      "assessment_id",
      assessments.map((a) => a.id),
    );

  const gradesByAssessment = new Map<string, Tables<"grade">[]>();
  for (const g of grades ?? []) {
    const list = gradesByAssessment.get(g.assessment_id) ?? [];
    list.push(g);
    gradesByAssessment.set(g.assessment_id, list);
  }

  const groupGradeIds = (grades ?? []).filter((g) => g.student_group_id).map((g) => g.id);
  const overrides = await listGroupGradeMembers(groupGradeIds);
  const overrideOf = new Map(
    overrides.map((o) => [
      `${o.grade_id}:${o.student_id}`,
      {
        attendance: o.attendance,
        factor: o.individual_factor,
        justification: o.justification,
      } satisfies MemberOverride,
    ]),
  );

  const perStudent = new Map<string, GradeInput[]>();
  for (const student of allStudents.values()) perStudent.set(student.id, []);

  for (const assessment of assessments) {
    const rows = gradesByAssessment.get(assessment.id) ?? [];
    const kind = assessment.is_group_grade ? "group" : "individual";
    const max = assessment.maxScore;
    for (const row of rows) {
      if (row.value === null) continue;
      if (assessment.is_group_grade && row.student_group_id) {
        for (const s of studentsByGroup.get(row.student_group_id) ?? []) {
          // Absent·e non prévenu·e : 0 ; excusé·e : hors moyenne ; pondération : note du groupe × facteur.
          const value = groupMemberValue(row.value, max, overrideOf.get(`${row.id}:${s.id}`));
          if (value !== null) perStudent.get(s.id)?.push({ value, kind, max });
        }
      } else if (row.student_id) {
        perStudent.get(row.student_id)?.push({ value: row.value, kind, max });
      }
    }
  }

  return Array.from(allStudents.values())
    .map((student) => ({ student, average: weightedAverage(perStudent.get(student.id) ?? []) }))
    .sort((a, b) => a.student.last_name.localeCompare(b.student.last_name, "fr"));
}
