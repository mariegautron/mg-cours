"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { formatBankDetails } from "@/lib/settings/bank";
import { parseAppreciationMax, validateEmailTemplate } from "@/lib/settings/school-rules";
import { readProfileForm, readSchoolForm } from "@/lib/settings/schema";
import { createClient } from "@/lib/supabase/server";
import { failure } from "@/lib/messages";
import { readTextSize, TEXT_SIZE_COOKIE } from "@/lib/settings/text-size";

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
    activity_number: d.activityNumber || null,
    vat_exempt: d.vatExempt,
    bank_details: formatBankDetails(d.iban, d.bic) || null,
    email: d.email || null,
    phone: d.phone || null,
  };

  const { error } = existing
    ? await supabase.from("teacher_profile").update(row).eq("id", existing.id)
    : await supabase.from("teacher_profile").insert(row);
  if (error) return { error: failure("enregistrer", { kept: true }) };

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
  if (error) return { error: failure("enregistrer", { kept: true }) };

  revalidatePath("/settings");
  redirect(`/settings?saved=${encodeURIComponent(d.name)}`);
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
  if (error) return { error: failure("enregistrer", { kept: true }) };

  revalidatePath("/settings");
  redirect(`/settings?saved=${encodeURIComponent(d.name)}`);
}

export async function deleteSchool(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("school").delete().eq("id", id);
  revalidatePath("/settings");
  redirect("/settings");
}

export interface SchoolRulesState {
  error?: string;
  fieldErrors?: { emailTemplate?: string; appreciationMax?: string };
  message?: string;
  savedAt?: number;
}

/** Règles d'une école (US-162) : absence excusée, modèle d'adresse, longueur d'appréciation. */
export async function saveSchoolRules(
  schoolId: string,
  _prev: SchoolRulesState,
  formData: FormData,
): Promise<SchoolRulesState> {
  const rule = String(formData.get("absenceRule") ?? "");
  if (rule !== "keep_group_grade" && rule !== "makeup") {
    return { error: "Choisis ce qui se passe pour une absence excusée." };
  }
  const template = String(formData.get("emailTemplate") ?? "").trim();
  const templateCheck = validateEmailTemplate(template);
  const max = parseAppreciationMax(String(formData.get("appreciationMax") ?? ""));
  const fieldErrors: NonNullable<SchoolRulesState["fieldErrors"]> = {};
  if (!templateCheck.ok) fieldErrors.emailTemplate = templateCheck.error;
  if (!max.ok) fieldErrors.appreciationMax = max.error;
  if (!templateCheck.ok || !max.ok) return { fieldErrors };

  const supabase = await createClient();
  const { data: school } = await supabase
    .from("school")
    .select("id")
    .eq("id", schoolId)
    .maybeSingle();
  if (!school) return { error: "Cette école n’existe plus." };

  const { error } = await supabase.from("school_setting").upsert(
    {
      school_id: schoolId,
      absence_rule: rule,
      email_template: template,
      appreciation_max: max.value,
    },
    { onConflict: "school_id" },
  );
  if (error) {
    return {
      error:
        "Les règles par école ne peuvent pas encore être enregistrées : la mise à jour de la base n’est pas faite.",
    };
  }
  revalidatePath("/settings");
  return { message: "Règles enregistrées.", savedAt: Date.now() };
}

export interface AccountState {
  error?: string;
  saved?: boolean;
}

/** Taille du texte : un cookie, lu par le layout racine (pas de flash au chargement). */
export async function saveTextSize(size: string): Promise<void> {
  const { cookies } = await import("next/headers");
  (await cookies()).set(TEXT_SIZE_COOKIE, readTextSize(size), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function changePassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (password !== confirm) return { error: "Les deux mots de passe ne sont pas identiques." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: failure("changer ton mot de passe", { kept: false }) };
  return { saved: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
