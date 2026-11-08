import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { ObservationTag } from "./notebook";

export interface CourseObservation {
  id: string;
  tag: ObservationTag;
  note: string | null;
  created_at: string;
  student: { id: string; first_name: string; last_name: string } | null;
}

/** Observations prises pendant une séance, les plus récentes d'abord. */
export async function listCourseObservations(courseId: string): Promise<CourseObservation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_observation")
    .select("id, tag, note, created_at, student:student_id(id, first_name, last_name)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as CourseObservation[];
}

export interface StudentObservation {
  id: string;
  tag: ObservationTag;
  note: string | null;
  created_at: string;
  course: { id: string; title: string; session_date: string | null } | null;
  module: { id: string; name: string } | null;
}

/** Journal d'un·e étudiant·e, tous modules confondus, les plus récentes d'abord. */
export async function listStudentObservations(studentId: string): Promise<StudentObservation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_observation")
    .select(
      "id, tag, note, created_at, course:course_id(id, title, session_date), module:module_id(id, name)",
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as StudentObservation[];
}

export interface ModuleObservation {
  id: string;
  tag: ObservationTag;
  note: string | null;
  created_at: string;
  student_id: string;
  student: { first_name: string; last_name: string } | null;
}

/** Observations d'un module (toutes séances), consultables pendant la correction. */
export async function listModuleObservations(moduleId: string): Promise<ModuleObservation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_observation")
    .select("id, tag, note, created_at, student_id, student:student_id(first_name, last_name)")
    .eq("module_id", moduleId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as ModuleObservation[];
}

export interface ObservationSummary {
  count: number;
  /** Étiquette de la dernière observation. */
  lastTag: ObservationTag;
}

/** Nombre d'observations et dernière étiquette de chaque étudiant·e (liste des étudiant·es). */
export async function observationSummaries(): Promise<Map<string, ObservationSummary>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_observation")
    .select("student_id, tag, created_at")
    .order("created_at", { ascending: false });
  const out = new Map<string, ObservationSummary>();
  for (const row of data ?? []) {
    const known = out.get(row.student_id);
    if (known) known.count += 1;
    else out.set(row.student_id, { count: 1, lastTag: row.tag });
  }
  return out;
}

export interface GroupObservationRow {
  id: string;
  tag: ObservationTag;
  note: string | null;
  created_at: string;
  student_group_id: string;
  course: { id: string; title: string; session_date: string | null } | null;
}

/** Observations de groupe d'une séance. Protégé : table absente → liste vide. */
export async function listCourseGroupObservations(
  courseId: string,
): Promise<GroupObservationRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("group_observation")
      .select(
        "id, tag, note, created_at, student_group_id, course:course_id(id, title, session_date)",
      )
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });
    return error ? [] : ((data ?? []) as unknown as GroupObservationRow[]);
  } catch {
    return [];
  }
}

/** Observations faites sur un groupe, les plus récentes d'abord. Protégé comme ci-dessus. */
export async function listGroupObservations(groupId: string): Promise<GroupObservationRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("group_observation")
      .select(
        "id, tag, note, created_at, student_group_id, course:course_id(id, title, session_date)",
      )
      .eq("student_group_id", groupId)
      .order("created_at", { ascending: false });
    return error ? [] : ((data ?? []) as unknown as GroupObservationRow[]);
  } catch {
    return [];
  }
}

/** Nombre d'observations de groupe par groupe, pour un module. Protégé. */
export async function countGroupObservations(moduleId: string): Promise<Map<string, number>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("group_observation")
      .select("student_group_id")
      .eq("module_id", moduleId);
    const counts = new Map<string, number>();
    if (error) return counts;
    for (const r of data ?? [])
      counts.set(r.student_group_id, (counts.get(r.student_group_id) ?? 0) + 1);
    return counts;
  } catch {
    return new Map();
  }
}
