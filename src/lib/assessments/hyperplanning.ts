import type { ResultSheet } from "@/lib/assessments/results";

/**
 * Aide à la saisie dans Hyperplanning (US-100) : une ligne par étudiant·e avec la note sur 20 telle qu'elle
 * s'y saisit (virgule décimale, 2 décimales). Les absent·es excusé·es n'ont pas de note (rattrapage à venir).
 */
export interface HyperplanningRow {
  lastName: string;
  firstName: string;
  /** « 14,50 », ou `null` : pas de note. */
  grade: string | null;
  remark: string | null;
}

const fmt = (n: number) => n.toFixed(2).replace(".", ",");

export function hyperplanningRows(sheets: readonly ResultSheet[]): HyperplanningRow[] {
  const seen = new Set<string>();
  const rows: HyperplanningRow[] = [];
  for (const sheet of sheets) {
    for (const r of sheet.recipients) {
      if (seen.has(r.name)) continue;
      seen.add(r.name);
      const [firstName = "", ...rest] = r.name.split(" ");
      rows.push({
        firstName: r.firstName ?? firstName,
        lastName: r.firstName ? r.name.slice(r.firstName.length + 1) : rest.join(" "),
        grade: sheet.valueOn20 === null ? null : fmt(sheet.valueOn20),
        remark:
          sheet.attendance === "absent_excused"
            ? "Absent·e excusé·e : pas de note, rattrapage"
            : sheet.attendance === "absent_unexcused"
              ? "Absent·e non prévenu·e : 0"
              : null,
      });
    }
  }
  return rows.sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"),
  );
}

const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function hyperplanningCsv(rows: readonly HyperplanningRow[]): string {
  return `﻿${[
    ["Nom", "Prénom", "Note /20", "Remarque"].map(cell).join(";"),
    ...rows.map((r) =>
      [r.lastName, r.firstName, r.grade ?? "", r.remark ?? ""].map(cell).join(";"),
    ),
  ].join("\r\n")}\r\n`;
}
