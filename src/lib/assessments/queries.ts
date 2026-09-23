import { createClient } from "@/lib/supabase/server";
import { noteProgress, weightedAverage, type NoteProgress } from "@/lib/ynov/notation";
import type { Tables } from "@/types/db";

export interface GridWithCriteria extends Tables<"grading_grid"> {
  criteria: Tables<"grid_criterion">[];
}

export async function listGrids(): Promise<GridWithCriteria[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("grading_grid").select("*, grid_criterion(*)").order("name");

  return (data ?? []).map((g) => {
    const { grid_criterion, ...grid } = g as unknown as Tables<"grading_grid"> & {
      grid_criterion: Tables<"grid_criterion">[];
    };
    return { ...grid, criteria: grid_criterion.sort((a, b) => a.position - b.position) };
  });
}

export async function getGrid(id: string): Promise<GridWithCriteria | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grading_grid")
    .select("*, grid_criterion(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { grid_criterion, ...grid } = data as unknown as Tables<"grading_grid"> & {
    grid_criterion: Tables<"grid_criterion">[];
  };
  return { ...grid, criteria: grid_criterion.sort((a, b) => a.position - b.position) };
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

export interface AssessmentWithMeta extends Tables<"assessment"> {
  student_group: Pick<Tables<"student_group">, "id" | "name"> | null;
  grading_grid: Pick<Tables<"grading_grid">, "id" | "name"> | null;
  gradeCount: number;
}

async function attachGradeCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessments: (Tables<"assessment"> & {
    student_group: Pick<Tables<"student_group">, "id" | "name"> | null;
    grading_grid: Pick<Tables<"grading_grid">, "id" | "name"> | null;
  })[],
): Promise<AssessmentWithMeta[]> {
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
    .select("*, student_group:student_group_id(id, name), grading_grid:grading_grid_id(id, name)")
    .eq("module_id", moduleId)
    .order("date", { ascending: false, nullsFirst: false });

  return attachGradeCounts(
    supabase,
    (data ?? []) as unknown as (Tables<"assessment"> & {
      student_group: Pick<Tables<"student_group">, "id" | "name"> | null;
      grading_grid: Pick<Tables<"grading_grid">, "id" | "name"> | null;
    })[],
  );
}

export async function listAllAssessments(): Promise<
  (AssessmentWithMeta & { module: Pick<Tables<"module">, "id" | "name" | "year"> | null })[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment")
    .select(
      "*, student_group:student_group_id(id, name), grading_grid:grading_grid_id(id, name), module:module_id(id, name, year)",
    )
    .order("date", { ascending: false, nullsFirst: false });

  const withCounts = await attachGradeCounts(
    supabase,
    (data ?? []) as unknown as (Tables<"assessment"> & {
      student_group: Pick<Tables<"student_group">, "id" | "name"> | null;
      grading_grid: Pick<Tables<"grading_grid">, "id" | "name"> | null;
      module: Pick<Tables<"module">, "id" | "name" | "year"> | null;
    })[],
  );
  return withCounts as (AssessmentWithMeta & {
    module: Pick<Tables<"module">, "id" | "name" | "year"> | null;
  })[];
}

export interface AssessmentDetail extends Tables<"assessment"> {
  student_group: (Tables<"student_group"> & { members: Tables<"student">[] }) | null;
  grading_grid: GridWithCriteria | null;
}

export async function getAssessment(id: string): Promise<AssessmentDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment")
    .select(
      "*, student_group:student_group_id(*, group_member(student:student_id(*))), grading_grid:grading_grid_id(*, grid_criterion(*))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const raw = data as unknown as Tables<"assessment"> & {
    student_group:
      (Tables<"student_group"> & { group_member: { student: Tables<"student"> | null }[] }) | null;
    grading_grid: (Tables<"grading_grid"> & { grid_criterion: Tables<"grid_criterion">[] }) | null;
  };

  const student_group = raw.student_group
    ? {
        ...raw.student_group,
        members: raw.student_group.group_member.map((m) => m.student).filter((s) => s !== null),
      }
    : null;

  const grading_grid = raw.grading_grid
    ? {
        ...raw.grading_grid,
        criteria: raw.grading_grid.grid_criterion.sort((a, b) => a.position - b.position),
      }
    : null;

  return { ...raw, student_group, grading_grid };
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
export async function moduleNoteProgress(
  moduleId: string,
  totalHours: number,
): Promise<NoteProgress> {
  const assessments = await listModuleAssessments(moduleId);
  const group = assessments.filter((a) => a.is_group_grade && a.gradeCount > 0).length;
  const individual = assessments.filter((a) => !a.is_group_grade && a.gradeCount > 0).length;
  return noteProgress(totalHours, { group, individual });
}

export interface StudentAverage {
  student: Tables<"student">;
  average: ReturnType<typeof weightedAverage>;
}

/** Moyenne pondérée YNOV (groupe ×1, individuel ×3) de chaque étudiant·e du module. */
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

  const perStudent = new Map<string, { value: number; kind: "group" | "individual" }[]>();
  for (const student of allStudents.values()) perStudent.set(student.id, []);

  for (const assessment of assessments) {
    const rows = gradesByAssessment.get(assessment.id) ?? [];
    const kind = assessment.is_group_grade ? "group" : "individual";
    for (const row of rows) {
      if (row.value === null) continue;
      if (assessment.is_group_grade && row.student_group_id) {
        for (const s of studentsByGroup.get(row.student_group_id) ?? []) {
          perStudent.get(s.id)?.push({ value: row.value, kind });
        }
      } else if (row.student_id) {
        perStudent.get(row.student_id)?.push({ value: row.value, kind });
      }
    }
  }

  return Array.from(allStudents.values())
    .map((student) => ({ student, average: weightedAverage(perStudent.get(student.id) ?? []) }))
    .sort((a, b) => a.student.last_name.localeCompare(b.student.last_name, "fr"));
}
