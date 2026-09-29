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
