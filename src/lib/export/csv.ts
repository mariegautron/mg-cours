/**
 * Export « Mes données » : CSV lisibles par Excel en français (UTF-8 avec BOM, séparateur `;`).
 * Fonctions pures.
 */

type Cell = string | number | boolean | null | undefined;

function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "number"
      ? value.toLocaleString("fr-FR", { useGrouping: false })
      : String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Un tableur : en-têtes puis lignes, avec BOM pour qu'Excel lise les accents. */
export function toCsv(headers: string[], rows: Cell[][]): string {
  return `﻿${[headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n")}\r\n`;
}

/** Nom de fichier sans caractère interdit, pour ranger les fichiers dans le .zip. */
export function safeName(name: string): string {
  return (
    name
      .normalize("NFC")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "fichier"
  );
}

export const README = (date: string, skipped: string[]) =>
  [
    `Marelle · export de mes données du ${date}`,
    "",
    "tableurs/ : un fichier par sujet (étudiant·es, notes, appréciations, présences, modules,",
    "  séances), à ouvrir avec Excel ou LibreOffice.",
    "Les fichiers (rendus, pièces jointes, documents, photos) sont dans un second .zip :",
    "  « Exporter mes fichiers » dans les réglages.",
    "donnees-completes.json : toutes les données de l'appli, pour une restauration future.",
    "",
    "ATTENTION : ce dossier contient tes coordonnées bancaires (IBAN) et les données de tes",
    "étudiant·es (notes, appréciations, photos). Garde-le en lieu sûr, ne le partage pas.",
    ...(skipped.length
      ? ["", "Fichiers non inclus (illisibles) :", ...skipped.map((s) => `- ${s}`)]
      : []),
    "",
  ].join("\r\n");
