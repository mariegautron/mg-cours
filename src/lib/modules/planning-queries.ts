import "server-only";

import type { PlanningInput } from "@/lib/modules/planning";
import { createClient } from "@/lib/supabase/server";

interface CourseRow {
  id: string;
  position: number;
  title: string;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  course_resource: {
    role: string;
    start_time: string | null;
    duration_minutes: number | null;
    resource: { title: string } | null;
  }[];
}

/** Séances d'un module avec leur déroulé (ressources principales) et leurs évaluations. */
export async function loadPlanning(
  moduleId: string,
): Promise<{ name: string; sessions: PlanningInput[] } | null> {
  const supabase = await createClient();
  const [{ data: mod }, { data: courses }, { data: assessments }] = await Promise.all([
    supabase.from("module").select("name").eq("id", moduleId).maybeSingle(),
    supabase
      .from("course")
      .select(
        "id, position, title, session_date, start_time, end_time, course_resource(role, start_time, duration_minutes, resource:resource_id(title))",
      )
      .eq("module_id", moduleId)
      .order("position"),
    supabase
      .from("assessment")
      .select("title, type, course_id, oral_start_time")
      .eq("module_id", moduleId),
  ]);
  if (!mod) return null;
  const sessions = ((courses ?? []) as unknown as CourseRow[]).map<PlanningInput>((c) => ({
    id: c.id,
    position: c.position,
    title: c.title,
    sessionDate: c.session_date,
    startTime: c.start_time,
    endTime: c.end_time,
    items: c.course_resource
      .filter((cr) => cr.role === "primary" && cr.resource)
      .map((cr) => ({
        title: cr.resource!.title,
        startTime: cr.start_time,
        minutes: cr.duration_minutes,
      })),
    assessments: (assessments ?? [])
      .filter((a) => a.course_id === c.id)
      .map((a) => ({ title: a.title, type: a.type, oralStartTime: a.oral_start_time })),
  }));
  return { name: mod.name, sessions };
}
