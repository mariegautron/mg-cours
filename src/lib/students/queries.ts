import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export interface StudentListFilters {
  q?: string;
  scholarGroup?: string;
  moduleId?: string;
}

export async function listStudents(filters: StudentListFilters = {}): Promise<Tables<"student">[]> {
  const supabase = await createClient();

  if (filters.moduleId) {
    const { data } = await supabase
      .from("group_member")
      .select("student:student_id(*), student_group:student_group_id(module_id)");

    const rows = (data ?? []) as unknown as {
      student: Tables<"student"> | null;
      student_group: { module_id: string } | null;
    }[];
    const students = rows
      .filter((r) => r.student_group?.module_id === filters.moduleId && r.student)
      .map((r) => r.student as Tables<"student">);
    const unique = Array.from(new Map(students.map((s) => [s.id, s])).values());
    return unique.sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"));
  }

  let query = supabase.from("student").select("*").order("last_name").order("first_name");
  if (filters.q) {
    const like = `%${filters.q}%`;
    query = query.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`);
  }
  if (filters.scholarGroup) query = query.eq("scholar_group", filters.scholarGroup);

  const { data } = await query;
  return data ?? [];
}

export async function getStudent(id: string): Promise<Tables<"student"> | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("student").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function listScholarGroups(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student")
    .select("scholar_group")
    .not("scholar_group", "is", null);
  const set = new Set((data ?? []).map((r) => r.scholar_group).filter((v): v is string => !!v));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
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
