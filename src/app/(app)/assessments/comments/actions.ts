"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { phraseInputSchema, type PhraseInput } from "@/lib/assessments/phrases";
import { readCommentForm } from "@/lib/assessments/schema";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";
import { failure, NOT_FOUND } from "@/lib/messages";

export interface CommentFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

export async function createComment(
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const parsed = readCommentForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { error } = await supabase.from("predefined_comment").insert({
    text: parsed.data.text,
    category: parsed.data.category,
    tags: parsed.data.tags,
    subject: parsed.data.subject,
  });
  if (error) return { error: failure("enregistrer", { kept: true }) };

  revalidatePath("/assessments/comments");
  redirect("/assessments/comments");
}

export async function updateComment(
  id: string,
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const parsed = readCommentForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("predefined_comment")
    .update({
      text: parsed.data.text,
      category: parsed.data.category,
      tags: parsed.data.tags,
      subject: parsed.data.subject,
    })
    .eq("id", id);
  if (error) return { error: failure("enregistrer", { kept: true }) };

  revalidatePath("/assessments/comments");
  redirect("/assessments/comments");
}

export async function deleteComment(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("predefined_comment").delete().eq("id", id);
  revalidatePath("/assessments/comments");
  redirect("/assessments/comments");
}

export interface SavePhraseResult {
  phrase?: Tables<"predefined_comment">;
  error?: string;
}

/**
 * « Enregistrer comme phrase » depuis un commentaire (US-84) : la phrase est rattachée à un critère
 * (libellé recopié) et à une matière. Son texte sera COPIÉ à l'insertion, jamais lié.
 */
export async function savePhrase(input: PhraseInput): Promise<SavePhraseResult> {
  const parsed = phraseInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Phrase invalide." };

  const supabase = await createClient();
  let criterionLabel: string | null = null;
  if (parsed.data.criterionId) {
    const { data: criterion } = await supabase
      .from("grid_criterion")
      .select("label")
      .eq("id", parsed.data.criterionId)
      .maybeSingle();
    if (!criterion) return { error: NOT_FOUND.criterion };
    criterionLabel = criterion.label;
  }

  const { data, error } = await supabase
    .from("predefined_comment")
    .insert({
      text: parsed.data.text,
      category: parsed.data.category,
      subject: parsed.data.subject,
      grid_criterion_id: parsed.data.criterionId,
      criterion_label: criterionLabel,
    })
    .select("*")
    .single();
  if (error || !data) return { error: failure("enregistrer") };

  revalidatePath("/assessments/comments");
  return { phrase: data };
}

/** Compte une insertion (tri « les plus utilisées en premier »). Sans effet si l'identifiant est invalide. */
export async function recordPhraseUse(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  await supabase.rpc("bump_comment_use", { comment_id: id });
}
