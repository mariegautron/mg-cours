/**
 * Règles de notation d'une école, telles qu'affichées (rattrapages lot 6) : les valeurs viennent des
 * réglages de l'école (`school_setting`, YNOV par défaut) ; ici seulement la résolution et les textes.
 */
import { YNOV_GRADING, type GradingRules } from "@/lib/ynov/notation";

/** École de référence dont les règles s'appliquent par défaut (module sans école). */
export const DEFAULT_SCHOOL_LABEL = "Nantes Ynov Campus";

export interface ResolvedRules {
  rules: GradingRules;
  /** Module sans école : les règles par défaut (YNOV) s'appliquent. */
  isDefault: boolean;
  schoolName: string | null;
}

export function resolveRules(
  schoolName: string | null | undefined,
  grading: GradingRules | null | undefined,
): ResolvedRules {
  const name = (schoolName ?? "").trim() || null;
  return { rules: grading ?? YNOV_GRADING, isDefault: !name, schoolName: name };
}

export function coefficientForRules(rules: GradingRules, isGroupGrade: boolean): number {
  return isGroupGrade ? rules.groupCoefficient : rules.individualCoefficient;
}

/** « Pondération Nantes Ynov Campus » ; sans école : celle de l'école par défaut. */
export function weightingLabel(r: ResolvedRules): string {
  return `Pondération ${r.schoolName ?? DEFAULT_SCHOOL_LABEL}`;
}

/** Phrase de pondération affichée sous les moyennes. */
export function weightingSentence(r: ResolvedRules): string {
  const base = `${weightingLabel(r)} : note de groupe ×${r.rules.groupCoefficient}, note individuelle ×${r.rules.individualCoefficient}.`;
  return r.isDefault
    ? `École non choisie : règles de ${DEFAULT_SCHOOL_LABEL} appliquées par défaut. ${base}`
    : base;
}
