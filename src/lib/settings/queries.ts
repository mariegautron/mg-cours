import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export async function getProfile(): Promise<Tables<"teacher_profile"> | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("teacher_profile").select("*").maybeSingle();
  return data;
}

export async function listAllSchools(): Promise<Tables<"school">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("school").select("*").order("name");
  return data ?? [];
}

export async function getSchool(id: string): Promise<Tables<"school"> | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("school").select("*").eq("id", id).maybeSingle();
  return data;
}

export interface SchoolRulesRow {
  absence_rule: string;
  email_template: string;
  appreciation_max: number;
}

/**
 * Règles par école (US-162). Protégé : si la table n'existe pas encore, `available` est faux et
 * chaque école garde les valeurs par défaut du code.
 */
export async function listSchoolRules(): Promise<{
  available: boolean;
  bySchool: Map<string, SchoolRulesRow>;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("school_setting")
      .select("school_id, absence_rule, email_template, appreciation_max");
    if (error || !data) return { available: false, bySchool: new Map() };
    return { available: true, bySchool: new Map(data.map((r) => [r.school_id, r])) };
  } catch {
    return { available: false, bySchool: new Map() };
  }
}
