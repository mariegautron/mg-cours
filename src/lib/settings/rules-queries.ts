import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import {
  DEFAULT_SCHOOL_RULES,
  readSchoolRules,
  type AbsenceRule,
  type SchoolRules,
} from "./school-rules";

/**
 * Règles de l'école d'un module (US-162). Protégé : table absente, module sans école ou erreur →
 * valeurs par défaut du code.
 */
export const getSchoolRulesForModule = cache(async (moduleId: string): Promise<SchoolRules> => {
  try {
    const supabase = await createClient();
    const { data: mod } = await supabase
      .from("module")
      .select("school_id")
      .eq("id", moduleId)
      .maybeSingle();
    if (!mod?.school_id) return { ...DEFAULT_SCHOOL_RULES };
    const { data, error } = await supabase
      .from("school_setting")
      .select("absence_rule, email_template, appreciation_max")
      .eq("school_id", mod.school_id)
      .maybeSingle();
    if (error) return { ...DEFAULT_SCHOOL_RULES };
    return readSchoolRules(data);
  } catch {
    return { ...DEFAULT_SCHOOL_RULES };
  }
});

/** Règle d'absence excusée de l'école d'un module. */
export async function getAbsenceRuleForModule(moduleId: string): Promise<AbsenceRule> {
  return (await getSchoolRulesForModule(moduleId)).absenceRule;
}
