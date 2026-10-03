/**
 * US-149a : appréciations à saisir dans Hyperplanning, écrites à la main. Fonctions pures :
 * comptage, limite de longueur, statut, format d'export (texte et CSV).
 */

export interface TextCount {
  /** Caractères au total (retours à la ligne compris). */
  chars: number;
  /** Caractères sans les espaces ni les retours à la ligne. */
  charsWithoutSpaces: number;
  /** Nombre de lignes (au moins 1 si le texte n'est pas vide). */
  lines: number;
}

export function countText(text: string): TextCount {
  const t = text.replace(/\r\n/g, "\n");
  return {
    chars: t.length,
    charsWithoutSpaces: t.replace(/\s/g, "").length,
    lines: t === "" ? 0 : t.split("\n").length,
  };
}

export type AppreciationStatus = "todo" | "written" | "too_long";

export const STATUS_LABELS: Record<AppreciationStatus, string> = {
  todo: "À écrire",
  written: "Écrite",
  too_long: "Trop longue",
};

/** À écrire (vide), écrite, ou trop longue pour le champ d'Hyperplanning. */
export function appreciationStatus(text: string, max: number): AppreciationStatus {
  const t = text.trim();
  if (!t) return "todo";
  return countText(t).chars > max ? "too_long" : "written";
}

/** Texte nettoyé avant enregistrement : retours Windows → \\n, espaces en bout retirés. */
export function cleanAppreciation(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

/** Validation de longueur : `ok` ou le nombre de caractères en trop. */
export function validateLength(
  text: string,
  max: number,
): { ok: true } | { ok: false; over: number; message: string } {
  const over = countText(cleanAppreciation(text)).chars - max;
  return over <= 0
    ? { ok: true }
    : {
        ok: false,
        over,
        message: `${over} caractère${over > 1 ? "s" : ""} en trop (maximum ${max}).`,
      };
}

/** Coupe au maximum, de préférence à la fin d'un mot ; ne coupe jamais avant la moitié de la limite. */
export function truncateAppreciation(text: string, max: number): string {
  const t = cleanAppreciation(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max / 2 ? cut.slice(0, space) : cut).trimEnd();
}

/** Message du compteur : « 142 / 250 caractères », « 12 caractères en trop ». */
export function counterLabel(text: string, max: number): string {
  const { chars } = countText(cleanAppreciation(text));
  return chars > max
    ? `${chars - max} caractère${chars - max > 1 ? "s" : ""} en trop (${chars} / ${max})`
    : `${chars} / ${max} caractère${max > 1 ? "s" : ""}`;
}

export interface ExportRow {
  firstName: string;
  lastName: string;
  text: string;
}

const upperName = (s: string) => s.toLocaleUpperCase("fr-FR");
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, " ").trim();

/** Ligne à coller : « NOM Prénom : texte » (le texte tient sur une ligne). */
export function exportLine(row: ExportRow): string {
  return `${upperName(row.lastName)} ${row.firstName} : ${oneLine(row.text)}`;
}

/** Les appréciations écrites, triées par nom puis prénom, une ligne chacune. */
export function exportAll(rows: readonly ExportRow[]): string {
  return sortRows(rows)
    .filter((r) => r.text.trim() !== "")
    .map(exportLine)
    .join("\n");
}

function sortRows<T extends ExportRow>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"),
  );
}

const csvCell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV (séparateur « ; », ouvert directement par un tableur français) : nom, prénom, appréciation. */
export function exportCsv(rows: readonly ExportRow[]): string {
  const lines = sortRows(rows)
    .filter((r) => r.text.trim() !== "")
    .map((r) => [upperName(r.lastName), r.firstName, oneLine(r.text)].map(csvCell).join(";"));
  return ["Nom;Prénom;Appréciation", ...lines].join("\r\n");
}
