/**
 * Nom affiché du formateur, tiré de la raison sociale du profil (« Marie GAUTRON EI ») :
 * formes juridiques retirées, casse « Prénom Nom ».
 */
const LEGAL_FORMS =
  /\b(e\.?\s?i\.?|e\.?i\.?r\.?l\.?|e\.?u\.?r\.?l\.?|s\.?a\.?s\.?u?\.?|s\.?a\.?r\.?l\.?|auto[-\s]?entrepreneu[rs]e?|micro[-\s]?entreprise|entreprise\s+individuelle)(?=\s|$|,)/gi;

const capitalize = (word: string) =>
  word
    .toLowerCase()
    .replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());

export function displayTeacherName(legalName: string | null | undefined): string {
  if (!legalName) return "";
  return legalName
    .replace(LEGAL_FORMS, " ")
    .replace(/[,;]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalize)
    .join(" ");
}

/** Prénom affiché (premier mot du nom affiché). */
export const displayFirstName = (legalName: string | null | undefined): string | undefined =>
  displayTeacherName(legalName).split(" ")[0] || undefined;

/**
 * Année scolaire « 2026-2027 » : de septembre (ou août) à l'été suivant, déduite de la première
 * séance ; à défaut, de l'année du module.
 */
export function schoolYear(firstSessionDate: string | null, fallbackYear: number): string {
  const match = firstSessionDate?.match(/^(\d{4})-(\d{2})/);
  const year = match ? Number(match[1]) : fallbackYear;
  const month = match ? Number(match[2]) : 9;
  const start = month >= 8 ? year : year - 1;
  return `${start}-${start + 1}`;
}
