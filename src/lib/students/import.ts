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

const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ["prénom", "prenom", "first name", "first_name", "firstname"],
  lastName: ["nom", "last name", "last_name", "lastname"],
  email: ["email", "e-mail", "mail", "courriel"],
  studentNumber: [
    "numéro étudiant",
    "numero etudiant",
    "student number",
    "student_number",
    "num etudiant",
    "matricule",
  ],
  scholarGroup: ["groupe", "promo", "promotion", "scholar group", "scholar_group", "classe"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function matchColumn(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(normalizeHeader(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse un export étudiants (CSV ou XLSX). Colonnes reconnues par alias tolérant
 * (accents/casse ignorés) : nom, prénom, email, numéro étudiant, groupe.
 * Les erreurs de ligne (champs manquants, e-mail invalide/en double dans le
 * fichier) sont retournées par ligne — aucune écriture ici (pur, testable).
 */
export function parseStudentsFile(input: ArrayBuffer | string): ParsedStudentRow[] {
  const workbook = XLSX.read(input, { type: typeof input === "string" ? "string" : "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (rows.length === 0) return [];

  const headers = rows[0].map(String);
  const col = {
    firstName: matchColumn(headers, HEADER_ALIASES.firstName),
    lastName: matchColumn(headers, HEADER_ALIASES.lastName),
    email: matchColumn(headers, HEADER_ALIASES.email),
    studentNumber: matchColumn(headers, HEADER_ALIASES.studentNumber),
    scholarGroup: matchColumn(headers, HEADER_ALIASES.scholarGroup),
  };

  const seenEmails = new Set<string>();
  const results: ParsedStudentRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const get = (idx: number) => (idx === -1 ? "" : String(raw[idx] ?? "").trim());

    const firstName = get(col.firstName);
    const lastName = get(col.lastName);
    const emailRaw = get(col.email);
    const email = emailRaw ? emailRaw.toLowerCase() : null;

    const errors: string[] = [];
    if (!firstName) errors.push("prénom manquant");
    if (!lastName) errors.push("nom manquant");
    if (email && !EMAIL_RE.test(email)) errors.push("e-mail invalide");
    if (email && seenEmails.has(email)) errors.push("e-mail en double dans le fichier");
    if (email) seenEmails.add(email);

    results.push({
      rowNumber: i + 1,
      firstName,
      lastName,
      email,
      studentNumber: get(col.studentNumber) || null,
      scholarGroup: get(col.scholarGroup) || null,
      errors,
    });
  }

  return results;
}
