"use server";

import { revalidatePath } from "next/cache";

import { cleanDeliverable } from "@/lib/modules/session-builder";
import { failure, NOT_FOUND } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export interface PlanState {
  error?: string;
  savedAt?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Enregistre l'ordre du déroulé, le livrable et l'état « prête » d'une séance (US-124). */
export async function saveSessionPlan(
  moduleId: string,
  courseId: string,
  input: { deliverable: string; resourceOrder: string[]; ready: boolean },
): Promise<PlanState> {
  const cleaned = cleanDeliverable(input.deliverable);
  if (!cleaned.ok) return { error: cleaned.error };
  const order = input.resourceOrder.filter((id) => UUID.test(id));

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("course")
    .select("id, prep_status")
    .eq("id", courseId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!course) return { error: NOT_FOUND.course };

  const { error } = await supabase
    .from("course_plan")
    .upsert(
      { course_id: courseId, deliverable: cleaned.text, resource_order: order },
      { onConflict: "course_id" },
    );
  if (error) return { error: failure("enregistrer le plan de la séance") };

  const prep = input.ready ? "ready" : course.prep_status === "ready" ? "todo" : course.prep_status;
  if (prep !== course.prep_status) {
    const { error: e2 } = await supabase
      .from("course")
      .update({ prep_status: prep })
      .eq("id", courseId);
    if (e2) return { error: failure("mettre à jour l’état de la séance") };
  }

  revalidatePath(`/modules/${moduleId}`);
  revalidatePath(`/modules/${moduleId}/build`);
  return { savedAt: new Date().toISOString() };
}
