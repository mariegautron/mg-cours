/**
 * US-126 : « Les évaluations du module ». Fonctions pures : message sur les notes exigées d'après
 * les heures du module (règle YNOV, `requiredNotes`), nombre de jalons, coefficients cumulés.
 */
export interface NotesProgressLike {
  requirement: { total: number; group: number; individual: number; exact: boolean };
  enteredTotal: number;
  satisfied: boolean;
  missingGroup: number;
  missingIndividual: number;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

/** « C'est complet » / « Il te manque 2 notes (1 de groupe, 1 individuelle) ». */
export function notesMessage(p: NotesProgressLike): string {
  if (p.requirement.total === 0)
    return "Renseigne les heures du module pour connaître les notes exigées.";
  if (p.satisfied) return "C’est complet : toutes les notes exigées sont prévues et saisies.";
  const missing = p.missingGroup + p.missingIndividual;
  const parts: string[] = [];
  if (p.missingGroup) parts.push(`${p.missingGroup} de groupe`);
  if (p.missingIndividual) parts.push(`${plural(p.missingIndividual, "individuelle")}`);
  return `Il te manque ${plural(missing, "note")} (${parts.join(", ")}).`;
}

/** « 21 h : 3 notes exigées » ; précise quand le volume est hors palier. */
export function requirementLabel(totalHours: number, p: NotesProgressLike): string {
  const base = `${totalHours} h : ${plural(p.requirement.total, "note")} exigée${p.requirement.total > 1 ? "s" : ""}`;
  return p.requirement.exact ? base : `${base} (volume hors palier, à confirmer)`;
}

/** Jalons du projet fil rouge : les évaluations de projet rattachées de rôle « jalon ». */
export function jalonsCount(
  assessments: readonly { project_id: string | null; project_role: string | null }[],
): number {
  return assessments.filter((a) => a.project_id && a.project_role === "milestone").length;
}

/** Somme des coefficients (barème ×1 groupe, ×3 individuel inclus dans le coefficient saisi). */
export function totalCoefficient(assessments: readonly { coefficient: number }[]): number {
  return (
    Math.round(
      assessments.reduce((n, a) => n + (Number.isFinite(a.coefficient) ? a.coefficient : 0), 0) *
        100,
    ) / 100
  );
}

/** Note de l'école (contrôle continu) : validation du titre et du coefficient saisis. */
export function validateSchoolGrade(input: {
  title: string;
  coefficient: string;
}): { ok: true; title: string; coefficient: number } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Donne un titre à cette note." };
  if (title.length > 200) return { ok: false, error: "Titre trop long (200 caractères maximum)." };
  const coefficient = Number(input.coefficient.trim().replace(",", "."));
  if (!Number.isFinite(coefficient) || coefficient <= 0 || coefficient > 10) {
    return { ok: false, error: "Le coefficient est un nombre entre 0 et 10." };
  }
  return { ok: true, title, coefficient };
}

export const SCHOOL_GRADE_TYPE = "Note de l'école";
