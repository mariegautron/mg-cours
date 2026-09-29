/** CSV des liens personnels (lisible par Excel : BOM, séparateur « ; », guillemets doublés). */
export interface LinkRow {
  lastName: string;
  firstName: string;
  email: string | null;
  url: string;
}

const cell = (v: string) => {
  // Une cellule qui commence par = + - @ serait interprétée comme une formule par un tableur.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function linksCsv(rows: readonly LinkRow[]): string {
  const lines = [
    ["Nom", "Prénom", "E-mail", "Lien personnel"].map(cell).join(";"),
    ...rows.map((r) => [r.lastName, r.firstName, r.email ?? "", r.url].map(cell).join(";")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

export const PERSONAL_LINK_WARNING = "Ce lien est personnel : ne le partage pas.";

export interface InviteContext {
  firstName: string;
  quizTitle: string;
  url: string;
  opensAt: string | null;
  closesAt: string | null;
  durationMinutes: number | null;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

export function inviteSubject(quizTitle: string): string {
  return `Ton lien pour le QCM « ${quizTitle} »`;
}

export function inviteText(c: InviteContext): string {
  const when = [
    c.opensAt ? `Ouverture : ${fmt(c.opensAt)}.` : null,
    c.closesAt ? `Fermeture : ${fmt(c.closesAt)}.` : null,
    c.durationMinutes ? `Durée : ${c.durationMinutes} minutes une fois commencé.` : null,
  ].filter(Boolean);
  return [
    `Bonjour ${c.firstName},`,
    "",
    `Voici ton lien personnel pour passer le QCM « ${c.quizTitle} » :`,
    c.url,
    "",
    PERSONAL_LINK_WARNING,
    ...(when.length ? ["", ...when] : []),
    "Tes réponses sont enregistrées au fur et à mesure ; pense à cliquer sur « Rendre ma copie » à la fin.",
    "",
    "À bientôt.",
  ].join("\n");
}
