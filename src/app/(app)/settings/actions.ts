"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readProfileForm, readSchoolForm } from "@/lib/settings/schema";
import { createClient } from "@/lib/supabase/server";

export interface SettingsFormState {
  error?: string;
  saved?: boolean;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

export async function saveProfile(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = readProfileForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase.from("teacher_profile").select("id").maybeSingle();

  const row = {
    legal_name: d.legalName,
    address: d.address || null,
    siret: d.siret || null,
    vat_number: d.vatNumber || null,
    vat_exempt: d.vatExempt,
    bank_details: d.bankDetails || null,
    email: d.email || null,
    phone: d.phone || null,
  };

  const { error } = existing
    ? await supabase.from("teacher_profile").update(row).eq("id", existing.id)
    : await supabase.from("teacher_profile").insert(row);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/settings");
  return { saved: true };
}

export async function createSchool(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = readSchoolForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("school").insert({
    name: d.name,
    siret: d.siret || null,
    address: d.address || null,
    billing_email: d.billingEmail || null,
    pa_identifier: d.paIdentifier || null,
  });
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/settings");
  redirect("/settings");
}

export async function updateSchool(
  id: string,
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = readSchoolForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("school")
    .update({
      name: d.name,
      siret: d.siret || null,
      address: d.address || null,
      billing_email: d.billingEmail || null,
      pa_identifier: d.paIdentifier || null,
    })
    .eq("id", id);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/settings");
  redirect("/settings");
}

export async function deleteSchool(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("school").delete().eq("id", id);
  revalidatePath("/settings");
  redirect("/settings");
}
