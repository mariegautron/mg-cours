import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { TodayCourse } from "./today";

/** Séances datées du jour `date` (AAAA-MM-JJ), avec leur module. */
export async function listCoursesOn(date: string): Promise<TodayCourse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select(
      "id, title, position, session_date, start_time, end_time, module:module_id(id, name, archived_at)",
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
      "id, title, position, session_date, start_time, end_time, module:module_id(id, name, archived_at)",
    )
    .gt("session_date", date)
    .order("session_date")
    .order("start_time")
    .limit(limit);
  return (data ?? []) as unknown as TodayCourse[];
}
