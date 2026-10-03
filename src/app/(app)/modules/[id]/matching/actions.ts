"use server";

import { revalidatePath } from "next/cache";

import { retainResource, unretainResource } from "@/app/(app)/modules/[id]/retained/actions";
import { createClient } from "@/lib/supabase/server";

const refresh = (moduleId: string) => {
  revalidatePath(`/modules/${moduleId}/matching`);
  revalidatePath(`/modules/${moduleId}`);
};

/** « Retenir » : la ressource proposée rejoint les ressources retenues du module (US-55). */
export async function retainForModule(moduleId: string, resourceId: string): Promise<void> {
  await retainResource(moduleId, resourceId);
  refresh(moduleId);
}

/** « Retirer » : la ressource n'est plus retenue pour ce module. */
export async function unretainForModule(moduleId: string, resourceId: string): Promise<void> {
  await unretainResource(moduleId, resourceId);
  refresh(moduleId);
}

/**
 * « Créer et retenir » : crée une ressource « à construire » d'après l'attendu (titre proposé = attendu,
 * modifiable, note d'intention) et la retient pour le module (US-57 + US-55).
 */
export async function buildForExpectation(
  moduleId: string,
  expectationId: string,
  formData?: FormData,
): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const { data: expectation } = await supabase
    .from("module_expectation")
    .select("label, module_id")
    .eq("id", expectationId)
    .maybeSingle();
  if (!expectation || expectation.module_id !== moduleId) return;

  const typed = String(formData?.get("title") ?? "").trim();
  const wanted = typed || expectation.label;
  const title = wanted.length > 200 ? `${wanted.slice(0, 199)}…` : wanted;
  const { data: resource } = await supabase
    .from("resource")
    .insert({
      title,
      status: "progress",
      intent_note: `Attendu de l'école : ${expectation.label}`.slice(0, 2000),
    })
    .select("id")
    .single();
  if (!resource) return;

  await retainResource(moduleId, resource.id);
  revalidatePath("/resources");
  refresh(moduleId);
}

/** Séances qui couvrent un attendu : remplace les liens par la sélection reçue. */
export async function setExpectationCourses(
  moduleId: string,
  expectationId: string,
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const [{ data: expectation }, { data: courses }] = await Promise.all([
    supabase
      .from("module_expectation")
      .select("id, module_id")
      .eq("id", expectationId)
      .maybeSingle(),
    supabase.from("course").select("id").eq("module_id", moduleId),
  ]);
  if (!expectation || expectation.module_id !== moduleId) return;

  // Seules les séances de ce module sont acceptées.
  const allowed = new Set((courses ?? []).map((c) => c.id));
  const wanted = formData
    .getAll("courseIds")
    .map(String)
    .filter((id) => allowed.has(id));

  await supabase
    .from("course_expectation")
    .delete()
    .eq("expectation_id", expectationId)
    .in("course_id", [...allowed]);
  if (wanted.length) {
    await supabase
      .from("course_expectation")
      .insert(wanted.map((course_id) => ({ course_id, expectation_id: expectationId })));
  }
  refresh(moduleId);
}

export interface DismissState {
  error?: string;
}

/**
 * « Ce n'est pas la bonne » : écarte la ressource de cet attendu (elle n'est plus proposée). Table
 * additive : sans la migration, on le dit au lieu d'échouer.
 */
export async function dismissMatch(
  moduleId: string,
  expectationId: string,
  resourceId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expectation_dismissal")
    .upsert(
      { module_id: moduleId, expectation_id: expectationId, resource_id: resourceId },
      { onConflict: "module_id,expectation_id,resource_id" },
    );
  if (error) return;
  refresh(moduleId);
}
