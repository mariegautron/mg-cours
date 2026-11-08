/**
 * Règles de notation rattachées à une école : paliers d'heures → notes exigées (groupe / individuelles),
 * coefficients, bonus. YNOV est le premier jeu de règles ; une autre école s'ajoute ici en déclarant
 * son propre jeu dans `REGISTRY` (aucun écran de réglage pour l'instant).
 */
import { GROUP_COEFFICIENT, INDIVIDUAL_COEFFICIENT } from "@/lib/ynov/notation";

export interface SchoolRules {
  key: string;
  label: string;
  /** Intitulé de la pondération, pour l'affichage. */
  weightingLabel: string;
  groupCoefficient: number;
  individualCoefficient: number;
  /** Les notes bonus (certification) s'ajoutent hors barème. */
  bonusAllowed: boolean;
}

export const YNOV_RULES: SchoolRules = {
  key: "ynov",
  label: "YNOV",
  weightingLabel: "Pondération YNOV",
  groupCoefficient: GROUP_COEFFICIENT,
  individualCoefficient: INDIVIDUAL_COEFFICIENT,
  bonusAllowed: true,
};

/** Jeux de règles connus ; la clé est cherchée dans le nom de l'école (insensible à la casse). */
const REGISTRY: readonly SchoolRules[] = [YNOV_RULES];

export interface ResolvedRules {
  rules: SchoolRules;
  /** Aucune école renseignée (ou inconnue) : les règles YNOV s'appliquent par défaut. */
  isDefault: boolean;
  schoolName: string | null;
}

export function rulesForSchool(schoolName: string | null | undefined): ResolvedRules {
  const name = (schoolName ?? "").trim();
  const found = name
    ? REGISTRY.find((r) => name.toLowerCase().includes(r.key.toLowerCase()))
    : undefined;
  return { rules: found ?? YNOV_RULES, isDefault: !found, schoolName: name || null };
}

export function coefficientForRules(rules: SchoolRules, isGroupGrade: boolean): number {
  return isGroupGrade ? rules.groupCoefficient : rules.individualCoefficient;
}

/** Phrase de pondération affichée sous les moyennes. */
export function weightingSentence(r: ResolvedRules): string {
  const base = `${r.rules.weightingLabel} : note de groupe ×${r.rules.groupCoefficient}, note individuelle ×${r.rules.individualCoefficient}.`;
  return r.isDefault
    ? `${r.schoolName ? `École « ${r.schoolName} » sans règles propres` : "École non renseignée"} : règles ${YNOV_RULES.label} appliquées par défaut. ${base}`
    : base;
}
