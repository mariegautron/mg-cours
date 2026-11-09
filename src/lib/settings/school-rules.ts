/**
 * US-162 : règles par école. Fonctions pures : lecture avec valeurs par défaut, validation du
 * modèle d'adresse e-mail, génération d'une adresse à partir du modèle.
 */

import { YNOV_GRADING, type GradingBracket, type GradingRules } from "@/lib/ynov/notation";

export type AbsenceRule = "keep_group_grade" | "makeup";

export interface SchoolRules {
  /** Absence excusée : garde la note du groupe, ou donne lieu à un rattrapage. Non prévenu·e = 0, toujours. */
  absenceRule: AbsenceRule;
  /** Modèle d'adresse des étudiant·es, ex. « {prenom}.{nom}@ynov.com » ; vide = pas de modèle. */
  emailTemplate: string;
  /** Longueur maximale d'une appréciation (caractères). */
  appreciationMax: number;
  /** Règles de notation (paliers d'heures, coefficients, bonus) ; YNOV par défaut. */
  grading: GradingRules;
}

export const DEFAULT_SCHOOL_RULES: SchoolRules = {
  absenceRule: "keep_group_grade",
  emailTemplate: "",
  appreciationMax: 250,
  grading: YNOV_GRADING,
};

const isCount = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 20;
const isCoefficient = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 20;

/** Paliers lus en base (`[{min_hours, max_hours, group, individual}]`) ; `null` si un palier est invalide. */
export function readBrackets(raw: unknown): GradingBracket[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: GradingBracket[] = [];
  for (const b of raw) {
    if (typeof b !== "object" || b === null) return null;
    const r = b as Record<string, unknown>;
    const min = r.min_hours;
    const max = r.max_hours;
    if (typeof min !== "number" || typeof max !== "number" || !(min > 0) || max < min) return null;
    if (!isCount(r.group) || !isCount(r.individual)) return null;
    out.push({ minHours: min, maxHours: max, group: r.group, individual: r.individual });
  }
  return out.sort((a, b) => a.minHours - b.minHours);
}

/** Paliers → forme stockée en base. */
export function writeBrackets(brackets: readonly GradingBracket[]) {
  return brackets.map((b) => ({
    min_hours: b.minHours,
    max_hours: b.maxHours,
    group: b.group,
    individual: b.individual,
  }));
}

/** Colonnes de notation (ou absentes : base pas encore à jour) → règles de notation, YNOV par défaut. */
export function readGradingRules(
  row: {
    group_coefficient?: number | string | null;
    individual_coefficient?: number | string | null;
    note_brackets?: unknown;
    bonus_allowed?: boolean | null;
  } | null,
): GradingRules {
  if (!row) return YNOV_GRADING;
  const g = Number(row.group_coefficient);
  const i = Number(row.individual_coefficient);
  return {
    groupCoefficient: isCoefficient(g) ? g : YNOV_GRADING.groupCoefficient,
    individualCoefficient: isCoefficient(i) ? i : YNOV_GRADING.individualCoefficient,
    brackets: readBrackets(row.note_brackets) ?? YNOV_GRADING.brackets,
    bonusAllowed:
      typeof row.bonus_allowed === "boolean" ? row.bonus_allowed : YNOV_GRADING.bonusAllowed,
  };
}

/** Coefficient saisi (« 1 », « 1,5 ») ; `null` si invalide. */
export function parseCoefficient(input: string): number | null {
  const n = Number(input.trim().replace(",", "."));
  return isCoefficient(n) ? Math.round(n * 100) / 100 : null;
}

export const ABSENCE_RULE_LABELS: Record<AbsenceRule, string> = {
  keep_group_grade: "Garde la note du groupe",
  makeup: "Rattrapage individuel",
};

export const APPRECIATION_MIN = 50;
export const APPRECIATION_LIMIT = 2000;

/** Ligne de `school_setting` (ou `null`) → règles complètes : toute valeur absente ou invalide retombe sur le défaut. */
export function readSchoolRules(
  row:
    | ({
        absence_rule?: string | null;
        email_template?: string | null;
        appreciation_max?: number | null;
      } & Parameters<typeof readGradingRules>[0])
    | null,
): SchoolRules {
  if (!row) return { ...DEFAULT_SCHOOL_RULES };
  const max = row.appreciation_max;
  return {
    absenceRule:
      row.absence_rule === "makeup" || row.absence_rule === "keep_group_grade"
        ? row.absence_rule
        : DEFAULT_SCHOOL_RULES.absenceRule,
    emailTemplate: (row.email_template ?? "").trim(),
    appreciationMax:
      typeof max === "number" &&
      Number.isInteger(max) &&
      max >= APPRECIATION_MIN &&
      max <= APPRECIATION_LIMIT
        ? max
        : DEFAULT_SCHOOL_RULES.appreciationMax,
    grading: readGradingRules(row),
  };
}

const VARIABLE = /\{([^{}]*)\}/g;
const ALLOWED_VARIABLES = new Set(["prenom", "nom"]);
// Partie locale : lettres, chiffres, point, tiret, tiret bas, plus ; domaine : lettres, chiffres, points, tirets.
const LOCAL_PART = /^[a-z0-9._+-]+$/;
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** Modèle valide : une seule arobase, variables {prenom} / {nom} seulement, un domaine, pas d'espace. */
export function validateEmailTemplate(
  template: string,
): { ok: true } | { ok: false; error: string } {
  const t = template.trim();
  if (!t) return { ok: true };
  if (/\s/.test(t)) return { ok: false, error: "Le modèle ne doit pas contenir d’espace." };
  const parts = t.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      ok: false,
      error: "Le modèle doit contenir une seule arobase, par exemple {prenom}.{nom}@ecole.fr.",
    };
  }
  const unknown = [...t.matchAll(VARIABLE)]
    .map((m) => m[1])
    .filter((v) => !ALLOWED_VARIABLES.has(v));
  if (unknown.length) {
    return { ok: false, error: `Variable inconnue : {${unknown[0]}}. Utilise {prenom} et {nom}.` };
  }
  if (/[{}]/.test(t.replace(VARIABLE, ""))) {
    return { ok: false, error: "Accolade mal fermée : écris {prenom} ou {nom}." };
  }
  if (!t.includes("{prenom}") && !t.includes("{nom}")) {
    return { ok: false, error: "Le modèle doit contenir {prenom} ou {nom}." };
  }
  const [local, domain] = parts;
  if (domain.includes("{"))
    return { ok: false, error: "Le domaine ne peut pas contenir de variable." };
  if (!LOCAL_PART.test(local.replace(VARIABLE, "x"))) {
    return { ok: false, error: "Caractères non autorisés avant l’arobase." };
  }
  if (!DOMAIN.test(domain.toLowerCase())) {
    return { ok: false, error: "Le domaine n’est pas valide (ex. ecole.fr)." };
  }
  return { ok: true };
}

/** Prénom ou nom → morceau d'adresse : sans accents, minuscules, espaces → « - », apostrophes retirées. */
export function slugName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/['’`´]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Adresse d'un·e étudiant·e depuis le modèle ; `null` sans modèle valide ou sans nom exploitable. */
export function emailFromTemplate(
  template: string,
  firstName: string,
  lastName: string,
): string | null {
  if (!template.trim() || !validateEmailTemplate(template).ok) return null;
  const first = slugName(firstName);
  const last = slugName(lastName);
  if (template.includes("{prenom}") && !first) return null;
  if (template.includes("{nom}") && !last) return null;
  return template.trim().replace("{prenom}", first).replace("{nom}", last).toLowerCase();
}

/** Validation de la longueur d'appréciation saisie. */
export function parseAppreciationMax(
  input: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const n = Number(input.trim());
  if (!Number.isInteger(n) || n < APPRECIATION_MIN || n > APPRECIATION_LIMIT) {
    return {
      ok: false,
      error: `Un nombre entier entre ${APPRECIATION_MIN} et ${APPRECIATION_LIMIT}.`,
    };
  }
  return { ok: true, value: n };
}

/** Champs « Règles de notation » du formulaire d'une école → règles validées. */
export function parseGradingForm(
  form: Pick<FormData, "get" | "getAll">,
): { ok: true; value: GradingRules } | { ok: false; error: string } {
  const groupCoefficient = parseCoefficient(String(form.get("groupCoefficient") ?? ""));
  const individualCoefficient = parseCoefficient(String(form.get("individualCoefficient") ?? ""));
  if (groupCoefficient === null || individualCoefficient === null) {
    return { ok: false, error: "Les coefficients sont des nombres entre 0 et 20 (ex. 1 ou 1,5)." };
  }
  const col = (name: string) => form.getAll(name).map((v) => String(v).trim());
  const mins = col("bracketMin");
  const maxs = col("bracketMax");
  const groups = col("bracketGroup");
  const individuals = col("bracketIndividual");
  const raw: unknown[] = [];
  for (let i = 0; i < mins.length; i++) {
    const cells = [mins[i], maxs[i], groups[i], individuals[i]];
    if (cells.every((c) => !c)) continue;
    if (cells.some((c) => !c)) {
      return {
        ok: false,
        error: `Palier ${i + 1} : remplis les quatre cases, ou vide-les toutes.`,
      };
    }
    const [min, max, group, individual] = cells.map((c) => Number(c!.replace(",", ".")));
    raw.push({ min_hours: min, max_hours: max, group, individual });
  }
  const brackets = readBrackets(raw);
  if (!brackets) {
    return {
      ok: false,
      error:
        "Paliers : au moins un, heures « de » ≤ « à », nombres de notes entiers entre 0 et 20.",
    };
  }
  for (let i = 1; i < brackets.length; i++) {
    if (brackets[i].minHours <= brackets[i - 1].maxHours) {
      return { ok: false, error: "Deux paliers se chevauchent : vérifie les heures." };
    }
  }
  return {
    ok: true,
    value: {
      groupCoefficient,
      individualCoefficient,
      brackets,
      bonusAllowed: form.get("bonusAllowed") === "on",
    },
  };
}
