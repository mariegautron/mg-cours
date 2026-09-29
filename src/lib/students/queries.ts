import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

import type { StudentYear } from "./years";

export interface StudentListFilters {
  q?: string;
  /** Promotion (texte), dans l'année choisie ou, sans année, dans n'importe laquelle. */
  scholarGroup?: string;
  moduleId?: string;
  /** Année scolaire de rentrée (2025 → « 2025-26 »). */
  year?: number;
}

export type StudentWithYears = Tables<"student"> & { years: StudentYear[] };

/** Promotion de chaque année scolaire, par étudiant·e (US-80b). */
async function yearsByStudent(): Promise<Map<string, StudentYear[]>> {
  const supabase = await createClient();
  const { data } = await supabase.from("student_year").select("student_id, year, scholar_group");
  const map = new Map<string, StudentYear[]>();
  for (const row of data ?? []) {
    map.set(row.student_id, [
      ...(map.get(row.student_id) ?? []),
      { year: row.year, scholar_group: row.scholar_group },
    ]);
  }
  return map;
}

export async function listStudents(filters: StudentListFilters = {}): Promise<StudentWithYears[]> {
  const supabase = await createClient();

  let students: Tables<"student">[];
  if (filters.moduleId) {
    const { data } = await supabase
      .from("group_member")
      .select("student:student_id(*), student_group:student_group_id(module_id)");

    const rows = (data ?? []) as unknown as {
      student: Tables<"student"> | null;
      student_group: { module_id: string } | null;
    }[];
    const inModule = rows
      .filter((r) => r.student_group?.module_id === filters.moduleId && r.student)
      .map((r) => r.student as Tables<"student">);
    students = Array.from(new Map(inModule.map((s) => [s.id, s])).values()).sort((a, b) =>
      a.last_name.localeCompare(b.last_name, "fr"),
    );
  } else {
    let query = supabase.from("student").select("*").order("last_name").order("first_name");
    if (filters.q) {
      const like = `%${filters.q}%`;
      query = query.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`);
    }
    const { data } = await query;
    students = data ?? [];
  }

  const years = await yearsByStudent();
  const withYears = students.map((s) => ({ ...s, years: years.get(s.id) ?? [] }));
  if (filters.year === undefined && !filters.scholarGroup) return withYears;
  return withYears.filter((s) =>
    s.years.some(
      (y) =>
        (filters.year === undefined || y.year === filters.year) &&
        (!filters.scholarGroup || y.scholar_group === filters.scholarGroup),
    ),
  );
}

export async function getStudent(id: string): Promise<Tables<"student"> | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("student").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Promotion de l'étudiant·e pour chaque année scolaire, la plus récente d'abord. */
export async function getStudentYears(studentId: string): Promise<StudentYear[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_year")
    .select("year, scholar_group")
    .eq("student_id", studentId)
    .order("year", { ascending: false });
  return data ?? [];
}

/** Promotions distinctes, dans l'année choisie ou toutes années confondues. */
export async function listScholarGroups(year?: number): Promise<string[]> {
  const supabase = await createClient();
  let query = supabase
    .from("student_year")
    .select("scholar_group")
    .not("scholar_group", "is", null);
  if (year !== undefined) query = query.eq("year", year);
  const { data } = await query;
  const set = new Set((data ?? []).map((r) => r.scholar_group).filter((v): v is string => !!v));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}

/** Années scolaires où au moins un·e étudiant·e est inscrit·e. */
export async function listStudentYears(): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("student_year").select("year");
  return [...new Set((data ?? []).map((r) => r.year))].sort((a, b) => b - a);
}

/** Groupes (module/étudiant) auxquels appartient un étudiant, avec le module associé. */
export async function getStudentGroups(
  studentId: string,
): Promise<
  (Tables<"student_group"> & { module: Pick<Tables<"module">, "id" | "name" | "year"> | null })[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_member")
    .select("student_group:student_group_id(*, module:module_id(id, name, year))")
    .eq("student_id", studentId);

  return (data ?? [])
    .map(
      (r) =>
        (
          r as unknown as {
            student_group: Tables<"student_group"> & {
              module: Pick<Tables<"module">, "id" | "name" | "year"> | null;
            };
          }
        ).student_group,
    )
    .filter(Boolean);
}

export interface GroupWithMembers extends Tables<"student_group"> {
  members: Tables<"student">[];
}

export async function listModuleGroups(moduleId: string): Promise<GroupWithMembers[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_group")
    .select("*, group_member(student:student_id(*))")
    .eq("module_id", moduleId)
    .order("name");

  return (data ?? []).map((g) => {
    const { group_member, ...group } = g as unknown as Tables<"student_group"> & {
      group_member: { student: Tables<"student"> | null }[];
    };
    return { ...group, members: group_member.map((m) => m.student).filter((s) => s !== null) };
  });
}

export async function getGroup(id: string): Promise<GroupWithMembers | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_group")
    .select("*, group_member(student:student_id(*))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { group_member, ...group } = data as unknown as Tables<"student_group"> & {
    group_member: { student: Tables<"student"> | null }[];
  };
  return { ...group, members: group_member.map((m) => m.student).filter((s) => s !== null) };
}
