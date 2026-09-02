"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readResourceForm } from "@/lib/resources/schema";
import { createClient } from "@/lib/supabase/server";

export interface ResourceFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

export async function createResource(
  _prev: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const parsed = readResourceForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resource")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description || null,
      content: parsed.data.content || null,
      url: parsed.data.url || null,
      category: parsed.data.category || null,
      tags: parsed.data.tags,
    })
    .select("id")
    .single();

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/resources");
  redirect(`/resources/${data.id}`);
}

export async function updateResource(
  id: string,
  _prev: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const parsed = readResourceForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resource")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      content: parsed.data.content || null,
      url: parsed.data.url || null,
      category: parsed.data.category || null,
      tags: parsed.data.tags,
    })
    .eq("id", id);

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
  redirect(`/resources/${id}`);
}

async function setArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  await supabase
    .from("resource")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
}

export async function archiveResource(id: string) {
  "use server";
  await setArchived(id, true);
}

export async function unarchiveResource(id: string) {
  "use server";
  await setArchived(id, false);
}

export async function deleteResource(id: string) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.from("resource").delete().eq("id", id);
  if (error) return;
  revalidatePath("/resources");
  redirect("/resources");
}
