import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { Surprise } from "./surprises";

export interface SurprisesData {
  /** La table existe ; sinon la section dit que la fonction arrive après la mise à jour de la base. */
  available: boolean;
  items: Surprise[];
}

export async function listProjectSurprises(projectId: string): Promise<SurprisesData> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("project_surprise")
      .select("id, title, body, course_id, sent_at")
      .eq("project_id", projectId)
      .order("created_at");
    if (error || !data) return { available: false, items: [] };
    return {
      available: true,
      items: data.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        courseId: r.course_id,
        sentAt: r.sent_at,
      })),
    };
  } catch {
    return { available: false, items: [] };
  }
}

export interface DueSurprise extends Surprise {
  moduleId: string;
  moduleName: string;
}

/** Imprévus pas encore envoyés dont la séance de diffusion est dans `courseIds` (rappel « Aujourd'hui »). */
export async function listSurprisesForCourses(courseIds: string[]): Promise<DueSurprise[]> {
  if (courseIds.length === 0) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("project_surprise")
      .select("id, title, body, course_id, sent_at, project:project_id(module:module_id(id, name))")
      .in("course_id", courseIds)
      .is("sent_at", null);
    if (error || !data) return [];
    return (
      data as unknown as {
        id: string;
        title: string;
        body: string;
        course_id: string | null;
        sent_at: string | null;
        project: { module: { id: string; name: string } | null } | null;
      }[]
    )
      .filter((r) => r.project?.module)
      .map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        courseId: r.course_id,
        sentAt: r.sent_at,
        moduleId: r.project!.module!.id,
        moduleName: r.project!.module!.name,
      }));
  } catch {
    return [];
  }
}
