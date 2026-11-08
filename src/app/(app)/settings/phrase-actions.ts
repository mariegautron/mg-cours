"use server";

import { revalidatePath } from "next/cache";

import { failure } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export interface PhraseState {
  error?: string;
  ok?: boolean;
}

const PARTS = ["strength", "axis", "encouragement"] as const;

function clean(raw: FormDataEntryValue | null): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ajoute une formulation de Marie pour une partie du gabarit. */
export async function addPhrase(_prev: PhraseState, formData: FormData): Promise<PhraseState> {
  const part = String(formData.get("part") ?? "");
  const text = clean(formData.get("text"));
  if (!PARTS.includes(part as (typeof PARTS)[number])) return { error: "Partie inconnue." };
  if (!text) return { error: "Écris ta formulation." };
  if (text.length > 300) return { error: "300 caractères maximum." };
  const supabase = await createClient();
  const { error } = await supabase.from("appreciation_phrase").insert({ part, text });
  if (error) return { error: failure("enregistrer") };
  revalidatePath("/settings");
  return { ok: true };
}

export async function updatePhrase(
  id: string,
  _prev: PhraseState,
  formData: FormData,
): Promise<PhraseState> {
  const text = clean(formData.get("text"));
  if (!text) return { error: "Écris ta formulation." };
  if (text.length > 300) return { error: "300 caractères maximum." };
  const supabase = await createClient();
  const { error } = await supabase.from("appreciation_phrase").update({ text }).eq("id", id);
  if (error) return { error: failure("enregistrer", { kept: true }) };
  revalidatePath("/settings");
  return { ok: true };
}

export async function deletePhrase(id: string) {
  const supabase = await createClient();
  await supabase.from("appreciation_phrase").delete().eq("id", id);
  revalidatePath("/settings");
}
