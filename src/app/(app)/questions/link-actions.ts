"use server";

import { revalidatePath } from "next/cache";

import { failure, NOT_FOUND } from "@/lib/messages";
import { diffLinks, keepKnown } from "@/lib/questions/links";
import { createClient } from "@/lib/supabase/server";

export interface LinkState {
  error?: string;
  saved?: boolean;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function apply(
  supabase: Supabase,
  fixed: { column: "resource_id" | "question_id"; id: string },
  other: "resource_id" | "question_id",
  wanted: string[],
): Promise<LinkState> {
  const { data: current, error } = await supabase
    .from("resource_question")
    .select("resource_id, question_id")
    .eq(fixed.column, fixed.id);
  if (error) {
    return { error: "La liaison sera disponible après la mise à jour de la base de données." };
  }
  const { add, remove } = diffLinks(
    (current ?? []).map((r) => r[other]),
    wanted,
  );
  if (remove.length) {
    const { error: e } = await supabase
      .from("resource_question")
      .delete()
      .eq(fixed.column, fixed.id)
      .in(other, remove);
    if (e) return { error: failure("enregistrer les liens") };
  }
  if (add.length) {
    const { error: e } = await supabase
      .from("resource_question")
      .insert(add.map((x) => ({ [fixed.column]: fixed.id, [other]: x }) as never));
    if (e) return { error: failure("enregistrer les liens") };
  }
  return { saved: true };
}

/** Questions liées à une ressource : remplace la sélection. */
export async function setResourceQuestions(
  resourceId: string,
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resource")
    .select("id")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return { error: NOT_FOUND.resource };
  const { data: known } = await supabase.from("question").select("id");
  const wanted = keepKnown(
    formData.getAll("ids").map(String),
    new Set((known ?? []).map((q) => q.id)),
  );
  const res = await apply(
    supabase,
    { column: "resource_id", id: resourceId },
    "question_id",
    wanted,
  );
  if (res.saved) {
    revalidatePath(`/resources/${resourceId}`);
    revalidatePath("/questions");
  }
  return res;
}

/** Ressources d'origine d'une question : remplace la sélection. */
export async function setQuestionResources(
  questionId: string,
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const supabase = await createClient();
  const { data: question } = await supabase
    .from("question")
    .select("id")
    .eq("id", questionId)
    .maybeSingle();
  if (!question) return { error: "Cette question n’existe plus." };
  const { data: known } = await supabase.from("resource").select("id");
  const wanted = keepKnown(
    formData.getAll("ids").map(String),
    new Set((known ?? []).map((r) => r.id)),
  );
  const res = await apply(
    supabase,
    { column: "question_id", id: questionId },
    "resource_id",
    wanted,
  );
  if (res.saved) {
    revalidatePath(`/questions/${questionId}`);
    revalidatePath("/questions");
  }
  return res;
}
