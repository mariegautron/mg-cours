import { z } from "zod";

/** Lien d'un rendu : http(s) uniquement (jamais `javascript:` ni `data:`). */
export function normalizeSubmissionUrl(raw: string): string | null | "invalid" {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "invalid";
  } catch {
    return "invalid";
  }
}

export const submissionSchema = z.object({
  receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
});

export interface SubmissionRow {
  groupId: string;
  groupName: string;
  receivedOn: string | null;
  url: string | null;
}

/** Résumé « 2/3 rendus reçus ». */
export function submissionSummary(rows: readonly Pick<SubmissionRow, "receivedOn">[]): string {
  const received = rows.filter((r) => r.receivedOn).length;
  return `${received}/${rows.length} rendu${received > 1 ? "s" : ""} reçu${received > 1 ? "s" : ""}`;
}
