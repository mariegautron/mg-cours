"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { formatBankDetails } from "@/lib/settings/bank";
import {
  parseAppreciationMax,
  parseGradingForm,
  validateEmailTemplate,
  writeBrackets,
} from "@/lib/settings/school-rules";
import { readProfileForm, readSchoolForm } from "@/lib/settings/schema";
import { createClient } from "@/lib/supabase/server";
import { failure } from "@/lib/messages";
import { DENSITY_COOKIE, readDensity } from "@/lib/settings/density";
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
  const { data: created, error } = await supabase
    .from("school")
    .insert({
      name: d.name,
      siret: d.siret || null,
      address: d.address || null,
      billing_email: d.billingEmail || null,
      pa_identifier: d.paIdentifier || null,
    })
    .select("id")
    .single();
  if (error || !created) return { error: failure("enregistrer", { kept: true }) };

  revalidatePath("/settings");
  // Étape suivante de « Nouvelle école » : ses règles de notation.
  redirect(
    `/settings?saved=${encodeURIComponent(d.name)}&regles=${created.id}#rules-${created.id}`,
  );
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
  fieldErrors?: { emailTemplate?: string; appreciationMax?: string; grading?: string };
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
  const grading = parseGradingForm(formData);
  if (!grading.ok) fieldErrors.grading = grading.error;
  if (!templateCheck.ok || !max.ok || !grading.ok) return { fieldErrors };

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
      group_coefficient: grading.value.groupCoefficient,
      individual_coefficient: grading.value.individualCoefficient,
      note_brackets: writeBrackets(grading.value.brackets),
      bonus_allowed: grading.value.bonusAllowed,
    },
    { onConflict: "school_id" },
  );
  if (error) {
    // Base pas encore à jour pour les règles de notation : on garde au moins les autres réglages.
    const { error: oldError } = await supabase.from("school_setting").upsert(
      {
        school_id: schoolId,
        absence_rule: rule,
        email_template: template,
        appreciation_max: max.value,
      },
      { onConflict: "school_id" },
    );
    if (oldError) {
      return {
        error:
          "Les règles par école ne peuvent pas encore être enregistrées : la mise à jour de la base n’est pas faite.",
      };
    }
    revalidatePath("/settings");
    return {
      message:
        "Règles enregistrées, sauf les règles de notation : la mise à jour de la base n’est pas faite.",
      savedAt: Date.now(),
    };
  }
  revalidatePath("/", "layout");
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

/** Densité de l'affichage (« Compacte » par défaut) : un cookie, lu par le layout racine. */
export async function saveDensity(density: string): Promise<void> {
  const { cookies } = await import("next/headers");
  (await cookies()).set(DENSITY_COOKIE, readDensity(density), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export async function changePassword(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current) return { error: "Tape ton mot de passe actuel." };
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (password !== confirm) return { error: "Les deux mots de passe ne sont pas identiques." };
  const supabase = await createClient();
  // Mot de passe actuel vérifié par une reconnexion avec l'e-mail du compte (session prise).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: failure("changer ton mot de passe", { kept: false }) };
  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (checkError) return { error: "Ce n’est pas ton mot de passe actuel." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: failure("changer ton mot de passe", { kept: false }) };
  return { saved: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** « E-mail de contact pour les étudiant·es » : seul ce champ est écrit (vide = aucun contact affiché). */
export async function saveStudentContact(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const email = String(formData.get("studentContactEmail") ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { fieldErrors: { studentContactEmail: ["Adresse e-mail invalide."] } };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("teacher_profile").select("id").maybeSingle();
  if (!existing) return { error: "Remplis d’abord « Mon identité »." };
  const { error } = await supabase
    .from("teacher_profile")
    .update({ student_contact_email: email || null })
    .eq("id", existing.id);
  if (error) return { error: failure("enregistrer", { kept: true }) };
  revalidatePath("/settings");
  return { saved: true };
}
