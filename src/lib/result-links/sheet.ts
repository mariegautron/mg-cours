/**
 * US-147 : résultats publiés par lien personnel. Fonctions pures : instantané des résultats d'UNE
 * personne (rien des autres), contrôle de forme à la lecture, statut de consultation, adresse du lien.
 */
import type { ResultSheet } from "@/lib/assessments/results";

export interface PublicSheet extends Omit<ResultSheet, "recipients"> {
  /** Seulement la personne concernée, sans adresse e-mail. */
  recipients: { name: string; firstName?: string; email: null }[];
}

/**
 * Instantané publié pour `studentId` : la fiche de résultats avec pour seul destinataire cette
 * personne (nom et prénom, jamais d'e-mail), donc sans le nom d'aucun·e autre membre du groupe.
 * `null` si la personne n'est pas destinataire de cette fiche.
 */
export function publicSheetFor(sheet: ResultSheet, studentId: string): PublicSheet | null {
  const me = sheet.recipients.find((r) => r.id === studentId);
  if (!me) return null;
  return {
    ...sheet,
    recipients: [{ name: me.name, firstName: me.firstName, email: null }],
  };
}

/** Relit un instantané lu en base sans lui faire confiance : forme minimale attendue, un seul destinataire. */
export function parsePublicSheet(raw: unknown): PublicSheet | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;
  if (
    typeof s.title !== "string" ||
    typeof s.moduleName !== "string" ||
    typeof s.maxScore !== "number" ||
    !Array.isArray(s.criteria) ||
    !Array.isArray(s.axes) ||
    !Array.isArray(s.recipients) ||
    s.recipients.length !== 1
  ) {
    return null;
  }
  return raw as PublicSheet;
}

export interface ViewInfo {
  first_viewed_at: string | null;
  view_count: number;
}

/** « Consulté le 02/11 à 09:15 (3 vues) » / « Pas encore consulté ». Aucune adresse ni donnée personnelle. */
export function viewStatus(v: ViewInfo): string {
  if (!v.first_viewed_at || v.view_count <= 0) return "Pas encore consulté";
  const d = new Date(v.first_viewed_at);
  const date = d.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
  });
  const time = d.toLocaleTimeString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Consulté le ${date} à ${time} (${v.view_count} vue${v.view_count > 1 ? "s" : ""})`;
}

export function resultUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/resultats/${token}`;
}

export interface LinkLine {
  name: string;
  url: string;
}

/** « Tout copier » : une ligne « NOM Prénom : lien » par personne. */
export function allLinksText(lines: readonly LinkLine[]): string {
  return lines.map((l) => `${l.name} : ${l.url}`).join("\n");
}
