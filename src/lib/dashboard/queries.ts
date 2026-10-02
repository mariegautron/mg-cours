import "server-only";

import { getModuleCourses } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { listModuleGroups } from "@/lib/students/queries";

import type { ReadinessInput } from "./readiness";
import type { TodayCourse } from "./today";

/** Séances datées du jour `date` (AAAA-MM-JJ), avec leur module. */
export async function listCoursesOn(date: string): Promise<TodayCourse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select(
      "id, title, position, session_date, start_time, end_time, prep_status, module:module_id(id, name, archived_at)",
    )
    .eq("session_date", date);
  return (data ?? []) as unknown as TodayCourse[];
}

/** Prochaines séances datées après `date` (les plus proches d'abord), avec leur module. */
export async function listCoursesAfter(date: string, limit = 20): Promise<TodayCourse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select(
      "id, title, position, session_date, start_time, end_time, prep_status, module:module_id(id, name, archived_at)",
    )
    .gt("session_date", date)
    .order("session_date")
    .order("start_time")
    .limit(limit);
  return (data ?? []) as unknown as TodayCourse[];
}

/** Séances datées entre `from` et `to` (bornes comprises), pour la frise de la semaine. */
export async function listCoursesBetween(from: string, to: string): Promise<TodayCourse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select(
      "id, title, position, session_date, start_time, end_time, prep_status, module:module_id(id, name, archived_at)",
    )
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date")
    .order("start_time");
  return (data ?? []) as unknown as TodayCourse[];
}

export interface SessionPrep {
  /** Rang de la séance dans le module (1-based) et nombre de séances du module. */
  number: number;
  total: number;
  /** Premier objectif d'apprentissage de la séance, s'il y en a. */
  objective: string | null;
  readiness: ReadinessInput;
  groupCount: number;
  studentCount: number;
}

/** Ce qu'il faut savoir d'une séance du jour : rang, objectif et entrées de la checklist. */
export async function getSessionPrep(moduleId: string, courseId: string): Promise<SessionPrep> {
  const [courses, groups] = await Promise.all([
    getModuleCourses(moduleId),
    listModuleGroups(moduleId),
  ]);
  const index = courses.findIndex((c) => c.id === courseId);
  const course = courses[index];
  const students = new Map(groups.flatMap((g) => g.members).map((m) => [m.id, m]));
  const withPhoto = [...students.values()].filter((m) => m.photo_path || m.photo_url).length;
  return {
    number: index + 1,
    total: courses.length,
    objective: course?.learning_objectives?.[0] ?? null,
    groupCount: groups.length,
    studentCount: students.size,
    readiness: {
      moduleId,
      courseId,
      prepStatus: course?.prep_status ?? "draft",
      resources: (course?.resources ?? []).map((r) => ({ status: r.status })),
      groupCount: groups.length,
      students: { total: students.size, withPhoto },
    },
  };
}
