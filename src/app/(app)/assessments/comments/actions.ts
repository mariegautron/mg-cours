"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readCommentForm } from "@/lib/assessments/schema";
import { createClient } from "@/lib/supabase/server";

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
  });
  if (error) return { error: "Enregistrement impossible." };

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
    .update({ text: parsed.data.text, category: parsed.data.category, tags: parsed.data.tags })
    .eq("id", id);
  if (error) return { error: "Enregistrement impossible." };

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
