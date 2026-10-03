/**
 * US-143 : critère « à points libres » avec attendus détaillés (grille d'oral type). Aucune migration :
 * les attendus vivent dans la description du critère, sous un titre Markdown « ### Attendus » (liste à
 * puces, lisible telle quelle dans les documents remis) ; les cases cochées d'une copie vivent dans
 * `grade.criterion_comments` sous la clé `checks:<critère>` (positions séparées par des virgules).
 */

export const EXPECTATIONS_HEADING = "### Attendus";
export const MAX_EXPECTATIONS = 30;
export const MAX_EXPECTATION_LENGTH = 200;

const HEADING = /^#{3}\s+attendus\s*$/i;
const BULLET = /^\s*(?:[-•*·▪●◦–—]|\d{1,2}[.)])\s+/;

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/** Lignes brutes → attendus propres : puces retirées, vides et doublons écartés, bornes appliquées. */
export function cleanExpectations(raw: string | readonly string[]): string[] {
  const lines = typeof raw === "string" ? raw.split(/\r?\n/) : raw;
  const out: string[] = [];
  for (const l of lines) {
    const t = oneLine(l.replace(BULLET, "")).slice(0, MAX_EXPECTATION_LENGTH);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= MAX_EXPECTATIONS) break;
  }
  return out;
}

/** Sépare une description en texte libre et attendus (le dernier bloc « ### Attendus »). */
export function splitDescription(description: string | null | undefined): {
  text: string;
  items: string[];
} {
  const lines = (description ?? "").replace(/\r\n?/g, "\n").split("\n");
  let at = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (HEADING.test(lines[i].trim())) {
      at = i;
      break;
    }
  }
  if (at === -1) return { text: (description ?? "").trim(), items: [] };
  const items = cleanExpectations(lines.slice(at + 1).filter((l) => BULLET.test(l)));
  return { text: lines.slice(0, at).join("\n").trim(), items };
}

/** Recompose la description : texte libre puis bloc « ### Attendus » s'il y en a. */
export function joinDescription(text: string, items: readonly string[]): string {
  const clean = cleanExpectations(items);
  const body = text.trim();
  if (clean.length === 0) return body;
  return `${body ? `${body}\n\n` : ""}${EXPECTATIONS_HEADING}\n${clean.map((i) => `- ${i}`).join("\n")}`;
}

export const checksKey = (criterionId: string) => `checks:${criterionId}`;

/** Clé de `criterion_comments` qui est un vrai commentaire (ni case cochée, ni commentaire d'axe). */
export const isFreeComment = (key: string) =>
  !key.startsWith("checks:") && !key.startsWith("axis:");

/** « 0,2 » → [0, 2] ; positions invalides, hors limite ou en double ignorées. */
export function parseChecks(value: string | null | undefined, count: number): number[] {
  if (!value || !/^\d+(,\d+)*$/.test(value)) return [];
  return [...new Set(value.split(",").map(Number))].filter((n) => n < count).sort((a, b) => a - b);
}

export const serializeChecks = (checked: readonly number[]): string =>
  [...new Set(checked)].sort((a, b) => a - b).join(",");

export function toggleCheck(checked: readonly number[], index: number): number[] {
  return checked.includes(index)
    ? checked.filter((i) => i !== index)
    : [...checked, index].sort((a, b) => a - b);
}

/** « 3 attendus sur 5 » (annoncé en direct pendant la notation). */
export function checksSummary(checked: number, total: number): string {
  return `${checked} attendu${checked > 1 ? "s" : ""} sur ${total}`;
}

/** Description lisible dans un document remis (PDF) : le bloc « ### Attendus » devient une liste « • ». */
export function plainDescription(description: string | null | undefined): string {
  const { text, items } = splitDescription(description);
  if (items.length === 0) return text;
  return `${text ? `${text}\n` : ""}Attendus :\n${items.map((i) => `• ${i}`).join("\n")}`;
}
