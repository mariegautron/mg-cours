import "server-only";

import { cache } from "react";

import { resolveRules, type ResolvedRules } from "@/lib/schools/rules";
import { createClient } from "@/lib/supabase/server";

import {
  DEFAULT_SCHOOL_RULES,
  readSchoolRules,
  type AbsenceRule,
  type SchoolRules,
} from "./school-rules";

export interface ModuleSchoolRules extends SchoolRules {
  /** Nom de l'école du module ; `null` : module sans école (règles YNOV par défaut). */
  schoolName: string | null;
}

/**
 * Règles de l'école d'un module (US-162, règles de notation : rattrapages lot 6). Protégé : table
 * ou colonnes absentes, module sans école ou erreur → valeurs par défaut du code (YNOV).
 * `select("*")` : lit les colonnes de notation si la migration est passée, sinon les ignore.
 */
export const getSchoolRulesForModule = cache(
  async (moduleId: string): Promise<ModuleSchoolRules> => {
    try {
      const supabase = await createClient();
      const { data: mod } = await supabase
        .from("module")
        .select("school_id, school:school_id(name)")
        .eq("id", moduleId)
        .maybeSingle();
      const schoolName = (mod?.school as { name: string } | null | undefined)?.name?.trim() || null;
      if (!mod?.school_id) return { ...DEFAULT_SCHOOL_RULES, schoolName: null };
      const { data, error } = await supabase
        .from("school_setting")
        .select("*")
        .eq("school_id", mod.school_id)
        .maybeSingle();
      if (error) return { ...DEFAULT_SCHOOL_RULES, schoolName };
      return { ...readSchoolRules(data), schoolName };
    } catch {
      return { ...DEFAULT_SCHOOL_RULES, schoolName: null };
    }
  },
);

/** Règle d'absence excusée de l'école d'un module. */
export async function getAbsenceRuleForModule(moduleId: string): Promise<AbsenceRule> {
  return (await getSchoolRulesForModule(moduleId)).absenceRule;
}

/** Règles de notation du module, prêtes à afficher (nom de l'école, défaut YNOV). */
export async function getResolvedRulesForModule(moduleId: string): Promise<ResolvedRules> {
  const r = await getSchoolRulesForModule(moduleId);
  return resolveRules(r.schoolName, r.grading);
}
