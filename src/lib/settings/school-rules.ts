/**
 * US-162 : règles par école. Fonctions pures : lecture avec valeurs par défaut, validation du
 * modèle d'adresse e-mail, génération d'une adresse à partir du modèle.
 */

export type AbsenceRule = "keep_group_grade" | "makeup";

export interface SchoolRules {
  /** Absence excusée : garde la note du groupe, ou donne lieu à un rattrapage. Non prévenu·e = 0, toujours. */
  absenceRule: AbsenceRule;
  /** Modèle d'adresse des étudiant·es, ex. « {prenom}.{nom}@ynov.com » ; vide = pas de modèle. */
  emailTemplate: string;
  /** Longueur maximale d'une appréciation (caractères). */
  appreciationMax: number;
}

export const DEFAULT_SCHOOL_RULES: SchoolRules = {
  absenceRule: "keep_group_grade",
  emailTemplate: "",
  appreciationMax: 250,
};

export const ABSENCE_RULE_LABELS: Record<AbsenceRule, string> = {
  keep_group_grade: "Garde la note du groupe",
  makeup: "Rattrapage individuel",
};

export const APPRECIATION_MIN = 50;
export const APPRECIATION_LIMIT = 2000;

/** Ligne de `school_setting` (ou `null`) → règles complètes : toute valeur absente ou invalide retombe sur le défaut. */
export function readSchoolRules(
  row: {
    absence_rule?: string | null;
    email_template?: string | null;
    appreciation_max?: number | null;
  } | null,
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
