import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { TodayCourse } from "./today";

/** Séances datées du jour `date` (AAAA-MM-JJ), avec leur module. */
export async function listCoursesOn(date: string): Promise<TodayCourse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select("id, title, position, session_date, module:module_id(id, name, archived_at)")
    .eq("session_date", date);
  return (data ?? []) as unknown as TodayCourse[];
}
