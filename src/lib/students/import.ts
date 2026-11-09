import * as XLSX from "xlsx";

export interface ParsedStudentRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string | null;
  studentNumber: string | null;
  scholarGroup: string | null;
  errors: string[];
}

/** Rôle d'une colonne du fichier. `fullName` : nom et prénom dans la même cellule. */
export type ColumnRole =
  "fullName" | "lastName" | "firstName" | "email" | "studentNumber" | "scholarGroup" | "ignore";

export const COLUMN_ROLE_LABELS: Record<ColumnRole, string> = {
  fullName: "nom + prénom",
  lastName: "nom",
  firstName: "prénom",
  email: "e-mail",
  studentNumber: "numéro étudiant",
  scholarGroup: "groupe ou promotion",
  ignore: "ignorée",
};

/** Ordre des mots dans une cellule « nom + prénom » quand rien n'est en MAJUSCULES. */
export type NameOrder = "last-first" | "first-last";

/** Tableau brut lu dans le fichier : en-têtes + cellules (texte). */
export interface RawTable {
  headers: string[];
  cells: string[][];
}

const HEADER_ALIASES: Record<Exclude<ColumnRole, "ignore" | "fullName">, string[]> = {
  firstName: ["prenom", "prenoms", "first name", "firstname"],
  lastName: ["nom", "nom de famille", "last name", "lastname"],
  email: ["email", "e mail", "mail", "courriel", "adresse mail", "adresse e mail"],
  studentNumber: [
    "numero etudiant",
    "numero etudiante",
    "n etudiant",
    "no etudiant",
    "num etudiant",
    "numero",
    "ine",
    "identifiant",
    "matricule",
    "student number",
    "id etudiant",
  ],
  scholarGroup: ["groupe", "promo", "promotion", "scholar group", "classe"],
};

/** Colonnes « nom + prénom » ; celles en `first-last` annoncent le prénom en premier. */
const FULL_NAME_HEADERS: Record<string, NameOrder> = {
  etudiant: "last-first",
  etudiante: "last-first",
  "etudiant e": "last-first",
  etudiants: "last-first",
  eleve: "last-first",
  apprenant: "last-first",
  apprenante: "last-first",
  "apprenant e": "last-first",
  "nom prenom": "last-first",
  "nom et prenom": "last-first",
  "nom complet": "last-first",
  identite: "last-first",
  "prenom nom": "first-last",
  "prenom et nom": "first-last",
};

/** Accents, casse, espaces et ponctuation ignorés (« N° étudiant » → « n etudiant »). */
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Décode un CSV : UTF-8 (avec ou sans BOM) s'il est valide, sinon Windows-1252 (export Excel
 * ou Hyperplanning sous Windows : « Écho » ne doit pas devenir « �cho »).
 */
export function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/** Séparateur le plus fréquent de la première ligne (hors guillemets) : `;`, `,` ou tabulation. */
function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  let quoted = false;
  for (const ch of firstLine) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch in counts) counts[ch]++;
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? best : ",";
}

/** Lecture CSV minimale (guillemets doublés, retours à la ligne entre guillemets). */
function parseCsv(text: string): string[][] {
  const sep = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Lit le fichier (texte CSV déjà décodé, ou classeur XLSX) en tableau brut. */
export function readTable(input: ArrayBuffer | string): RawTable {
  let rows: string[][];
  if (typeof input === "string") {
    rows = parseCsv(input.replace(/^﻿/, ""));
  } else {
    const workbook = XLSX.read(input, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils
      .sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" })
      .map((r) => r.map((c) => String(c ?? "")));
  }
  if (rows.length === 0) return { headers: [], cells: [] };
  return { headers: rows[0].map((h) => h.trim()), cells: rows.slice(1) };
}

/** Rôle de chaque colonne d'après son en-tête, et l'ordre annoncé des colonnes « nom + prénom ». */
export function detectRoles(headers: string[]): { roles: ColumnRole[]; nameOrder: NameOrder } {
  const normalized = headers.map(normalizeHeader);
  const roles: ColumnRole[] = normalized.map(() => "ignore");
  let nameOrder: NameOrder = "last-first";

  for (const role of ["firstName", "email", "studentNumber", "scholarGroup"] as const) {
    for (const alias of HEADER_ALIASES[role]) {
      const idx = normalized.findIndex((h, i) => h === alias && roles[i] === "ignore");
      if (idx !== -1) {
        roles[idx] = role;
        break;
      }
    }
  }
  const fullIdx = normalized.findIndex((h, i) => roles[i] === "ignore" && h in FULL_NAME_HEADERS);
  if (fullIdx !== -1) {
    roles[fullIdx] = "fullName";
    nameOrder = FULL_NAME_HEADERS[normalized[fullIdx]];
  }
  const lastIdx = normalized.findIndex(
    (h, i) => roles[i] === "ignore" && HEADER_ALIASES.lastName.includes(h),
  );
  if (lastIdx !== -1) {
    // « Nom » seul, sans colonne Prénom ni autre colonne de nom complet : c'est un nom complet.
    roles[lastIdx] = !roles.includes("firstName") && fullIdx === -1 ? "fullName" : "lastName";
  }
  return { roles, nameOrder };
}

const PARTICLES = new Set([
  "de",
  "du",
  "des",
  "le",
  "la",
  "les",
  "van",
  "von",
  "der",
  "da",
  "di",
  "d",
]);

function isUpperWord(word: string): boolean {
  const letters = word.replace(/[^\p{L}]/gu, "");
  return (
    letters.length >= 2 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()
  );
}

/**
 * Coupe « NOM Prénom » : les mots en MAJUSCULES forment le nom, le reste le prénom. Si rien (ou
 * tout) n'est en majuscules, on suit l'ordre annoncé ; une particule (de, van…) reste avec le nom.
 */
export function splitFullName(
  value: string,
  order: NameOrder = "last-first",
): { firstName: string; lastName: string } {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { firstName: "", lastName: "" };
  if (words.length === 1) return { firstName: "", lastName: words[0] };
  const upper = words.map(isUpperWord);
  const upperCount = upper.filter(Boolean).length;
  if (upperCount > 0 && upperCount < words.length) {
    return {
      lastName: words.filter((_, i) => upper[i]).join(" "),
      firstName: words.filter((_, i) => !upper[i]).join(" "),
    };
  }
  const isParticle = (w: string) => PARTICLES.has(normalizeHeader(w));
  if (order === "last-first") {
    let end = 0;
    while (end < words.length - 2 && isParticle(words[end])) end++;
    return {
      lastName: words.slice(0, end + 1).join(" "),
      firstName: words.slice(end + 1).join(" "),
    };
  }
  let start = words.length - 1;
  while (start > 1 && isParticle(words[start - 1])) start--;
  return { firstName: words.slice(0, start).join(" "), lastName: words.slice(start).join(" ") };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Erreurs d'une ligne (champs manquants, e-mail invalide ou en double). */
export function rowErrors(
  row: Pick<ParsedStudentRow, "firstName" | "lastName" | "email">,
  seenEmails?: Set<string>,
): string[] {
  const errors: string[] = [];
  if (!row.firstName.trim()) errors.push("prénom manquant");
  if (!row.lastName.trim()) errors.push("nom manquant");
  if (row.email && !EMAIL_RE.test(row.email)) errors.push("e-mail invalide");
  if (row.email && seenEmails?.has(row.email)) errors.push("e-mail en double dans le fichier");
  if (row.email) seenEmails?.add(row.email);
  return errors;
}

export type RowEdit = Partial<Pick<ParsedStudentRow, "firstName" | "lastName" | "email">>;

export interface BuildOptions {
  nameOrder?: NameOrder;
  /** « Inverser nom et prénom » : échange les deux sur toutes les lignes. */
  swap?: boolean;
  /** Corrections faites à la main dans l'aperçu, par numéro de ligne. */
  edits?: Record<number, RowEdit>;
}

/** Construit les lignes à partir du tableau brut et du rôle de chaque colonne (pur). */
export function buildRows(
  table: RawTable,
  roles: ColumnRole[],
  options: BuildOptions = {},
): ParsedStudentRow[] {
  const at = (role: ColumnRole) => roles.indexOf(role);
  const col = {
    firstName: at("firstName"),
    lastName: at("lastName"),
    fullName: at("fullName"),
    email: at("email"),
    studentNumber: at("studentNumber"),
    scholarGroup: at("scholarGroup"),
  };
  const seenEmails = new Set<string>();
  return table.cells.map((raw, i) => {
    const get = (idx: number) => (idx === -1 ? "" : String(raw[idx] ?? "").trim());
    let firstName = get(col.firstName);
    let lastName = get(col.lastName);
    if (col.fullName !== -1) {
      const split = splitFullName(get(col.fullName), options.nameOrder);
      if (!firstName) firstName = split.firstName;
      if (!lastName) lastName = split.lastName;
    }
    if (options.swap) [firstName, lastName] = [lastName, firstName];
    const rowNumber = i + 2;
    const edit = options.edits?.[rowNumber];
    if (edit?.firstName !== undefined) firstName = edit.firstName.trim();
    if (edit?.lastName !== undefined) lastName = edit.lastName.trim();
    const emailRaw = edit?.email !== undefined ? (edit.email ?? "").trim() : get(col.email);
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    return {
      rowNumber,
      firstName,
      lastName,
      email,
      studentNumber: get(col.studentNumber) || null,
      scholarGroup: get(col.scholarGroup) || null,
      errors: rowErrors({ firstName, lastName, email }, seenEmails),
    };
  });
}

/**
 * Parse un export étudiants (CSV déjà décodé, ou XLSX). Colonnes reconnues par en-tête tolérant
 * (accents, casse, ponctuation ignorés), y compris une colonne « Étudiant » = « NOM Prénom ».
 * Les erreurs de ligne sont retournées par ligne — aucune écriture ici (pur, testable).
 */
export function parseStudentsFile(input: ArrayBuffer | string): ParsedStudentRow[] {
  const table = readTable(input);
  if (table.headers.length === 0) return [];
  const { roles, nameOrder } = detectRoles(table.headers);
  return buildRows(table, roles, { nameOrder });
}
