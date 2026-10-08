import "server-only";

import { buildFrise, type Frise } from "@/lib/modules/frise";
import { DEFAULT_ESPACE_OPTIONS, isStale, type EspaceOptions } from "@/lib/modules/espace";
import { parseEspace } from "@/lib/modules/espace";
import { latestChange, optionsOf } from "@/lib/modules/espace-queries";
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
      .select(
        "id, title, course_id, is_group_grade, makeup_of_id, project_role, project_id, deliverable_md, prep_status",
      )
      .eq("module_id", moduleId),
  ]);
  if (!mod) return null;
  // Slides par séance : colonne additive, lue à part pour que la frise survive sans la migration.
  const slides = new Map<string, string | null>();
  try {
    const { data, error } = await supabase
      .from("course")
      .select("id, slides_url")
      .eq("module_id", moduleId);
    if (!error) for (const c of data ?? []) slides.set(c.id, c.slides_url);
  } catch {
    /* colonne absente : pas de slides */
  }
  return buildFrise({
    moduleName: mod.name,
    totalHours: mod.total_hours ?? null,
    courses: (courses ?? []).map((c) => ({ ...c, slides_url: slides.get(c.id) ?? null })),
    assessments: assessments ?? [],
  });
}

export interface ShareLinkInfo {
  /** La table existe ; sinon le lien est indisponible. */
  available: boolean;
  active: {
    publishedAt: string;
    viewCount: number;
    options: EspaceOptions;
    quizUrl: string | null;
    /** Des données du module ont changé depuis la publication. */
    stale: boolean;
  } | null;
}

export async function getShareLinkInfo(moduleId: string): Promise<ShareLinkInfo> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("module_share_link")
      .select("published_at, view_count, payload")
      .eq("module_id", moduleId)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) return { available: false, active: null };
    return {
      available: true,
      active: data
        ? {
            publishedAt: data.published_at,
            viewCount: data.view_count,
            options: optionsOf(data.payload) ?? DEFAULT_ESPACE_OPTIONS,
            quizUrl: parseEspace(data.payload)?.quiz?.url ?? null,
            stale: isStale(data.published_at, await latestChange(moduleId)),
          }
        : null,
    };
  } catch {
    return { available: false, active: null };
  }
}

/** Liens personnels : combien de personnes dans le module, combien ont un lien actif. */
export async function getStudentLinkInfo(
  moduleId: string,
  students: number,
): Promise<{ available: boolean; students: number; active: number }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("module_student_link")
      .select("student_id")
      .eq("module_id", moduleId)
      .is("revoked_at", null);
    if (error) return { available: false, students, active: 0 };
    return { available: true, students, active: data?.length ?? 0 };
  } catch {
    return { available: false, students, active: 0 };
  }
}
