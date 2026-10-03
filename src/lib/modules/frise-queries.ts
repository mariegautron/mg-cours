import "server-only";

import { buildFrise, type Frise } from "@/lib/modules/frise";
import { createClient } from "@/lib/supabase/server";

/** Frise d'un module à partir des séances et des évaluations (pas de donnée d'étudiant·e). */
export async function loadFrise(moduleId: string): Promise<Frise | null> {
  const supabase = await createClient();
  const [{ data: mod }, { data: courses }, { data: assessments }] = await Promise.all([
    supabase.from("module").select("name, total_hours").eq("id", moduleId).maybeSingle(),
    supabase
      .from("course")
      .select("id, title, session_date, start_time")
      .eq("module_id", moduleId)
      .order("position")
      .order("created_at"),
    supabase
      .from("assessment")
      .select("id, title, course_id, is_group_grade, makeup_of_id")
      .eq("module_id", moduleId),
  ]);
  if (!mod) return null;
  return buildFrise({
    moduleName: mod.name,
    totalHours: mod.total_hours ?? null,
    courses: courses ?? [],
    assessments: assessments ?? [],
  });
}

export interface ShareLinkInfo {
  /** La table existe ; sinon le lien est indisponible. */
  available: boolean;
  active: { publishedAt: string; viewCount: number } | null;
}

export async function getShareLinkInfo(moduleId: string): Promise<ShareLinkInfo> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("module_share_link")
      .select("published_at, view_count")
      .eq("module_id", moduleId)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) return { available: false, active: null };
    return {
      available: true,
      active: data ? { publishedAt: data.published_at, viewCount: data.view_count } : null,
    };
  } catch {
    return { available: false, active: null };
  }
}
