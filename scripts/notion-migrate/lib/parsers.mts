// Analyse des contenus Notion propres aux cours : progression pédagogique et grilles.
import { cleanInline } from "./notion.mts";

const MONTHS: Record<string, string> = {
  janvier: "01",
  février: "02",
  fevrier: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  août: "08",
  aout: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  décembre: "12",
  decembre: "12",
};

/** « 8 janvier 2026 » → « 2026-01-08 ». */
export function frenchDate(s: string): string | null {
  const m = /(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i.exec(s);
  if (!m || !MONTHS[m[2].toLowerCase()]) return null;
  return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
}

export interface ProgressionSession {
  number: number;
  date: string | null;
  title: string;
  durationHours: number | null;
  objectives: string[];
  animation: string;
  assessment: string;
  material: string;
}

function section(block: string, heading: RegExp): string {
  const parts = block.split(/^### /m);
  const hit = parts.find((p) => heading.test(p.split("\n")[0]));
  return hit ? hit.split("\n").slice(1).join("\n").trim() : "";
}

const bullets = (s: string) =>
  s
    .split("\n")
    .filter((l) => /^\s*- /.test(l))
    .map((l) => cleanInline(l.replace(/^\s*- /, "")))
    .filter(Boolean);

/** Découpe une page « PROGRESSION PÉDAGOGIQUE » (format de la trame YNOV) en séances. */
export function parseProgression(body: string): ProgressionSession[] {
  const chunks = body.split(/^## Séance /m).slice(1);
  return chunks.map((chunk) => {
    const [head, ...rest] = chunk.split("\n");
    const block = rest.join("\n").split(/^---$/m)[0];
    const number = Number(/^(\d+)/.exec(head)?.[1]);
    const titleMatch = /\*\*Titre de la séance :\*\*([\s\S]*?)\*\*Durée/.exec(block);
    const title = (titleMatch?.[1] ?? "").split("\n").map(cleanInline).filter(Boolean).join(" / ");
    const duration = /\*\*Durée :\*\*\s*([\d,.]+)/.exec(block)?.[1];
    return {
      number,
      date: frenchDate(head),
      title,
      durationHours: duration ? Number(duration.replace(",", ".")) : null,
      objectives: bullets(section(block, /^Objectifs/)),
      animation: section(block, /^Modalités d.animation/),
      assessment: section(block, /^Modalités d.évaluation/),
      material: section(block, /^Matériel/),
    };
  });
}

export interface GridCriterion {
  label: string;
  weight: number;
  description: string;
}

export interface Grid {
  criteria: GridCriterion[];
  /** Rappels pédagogiques / consignes générales de la grille. */
  notes: string;
}

/**
 * Grilles au format « ### 1️⃣ Libellé — (gras)/6(gras) » suivies des niveaux de notation
 * (« ☐ **6 pts** … »). Le texte des niveaux devient la description du critère.
 */
export function parseGrid(body: string): Grid {
  const criteria: GridCriterion[] = [];
  const parts = body.split(/^(?=##+ )/m);
  let notes = "";
  for (const part of parts) {
    const [head, ...rest] = part.split("\n");
    const m = /^###\s+(?:\S+\s+)?(.+?)\s+[—–-]\s+\*\*\/\s*([\d.,]+)\s*\*\*/.exec(head);
    if (m) {
      const description = rest
        .join("\n")
        .split(/^---$/m)[0]
        .replace(/^\*\*Commentaires[^\n]*\n(…|\.\.\.)?/gm, "")
        .replace(/☐\s*/g, "")
        .replace(/^>\s?/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      criteria.push({
        label: cleanInline(m[1]),
        weight: Number(m[2].replace(",", ".")),
        description,
      });
    } else if (/^## .*Rappels/.test(head)) {
      notes = rest.join("\n").split(/^---$/m)[0].trim();
    }
  }
  return { criteria, notes };
}

/** CSV simple (séparateur virgule, guillemets doubles). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) rows.push([...row, cell]);
  const [header, ...data] = rows.filter((r) => r.some((c) => c.trim()));
  return data.map((r) => Object.fromEntries(header.map((h, k) => [h.trim(), (r[k] ?? "").trim()])));
}

/** Sections « ### Titre » d'une page : titre sans emoji → contenu. */
export function headingSections(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of body.split(/^### /m).slice(1)) {
    const [head, ...rest] = part.split("\n");
    const key = cleanInline(head)
      .replace(/^[^\p{L}\d]+/u, "")
      .toLowerCase();
    out.set(key, rest.join("\n").split(/^---$/m)[0].trim());
  }
  return out;
}

/** « 27 novembre 2025 13:00 (UTC+1) → 16:00 » → date, heures de début / fin, durée (h). */
export function frenchDateTimeRange(s: string | undefined): {
  date: string | null;
  start: string | null;
  end: string | null;
  hours: number | null;
} {
  const date = frenchDate(s ?? "");
  const times = [...(s ?? "").matchAll(/(\d{1,2}):(\d{2})/g)];
  if (times.length < 2) return { date, start: times[0]?.[0] ?? null, end: null, hours: null };
  const [a, b] = times.map((t) => Number(t[1]) + Number(t[2]) / 60);
  return { date, start: times[0][0], end: times[1][0], hours: Math.round((b - a) * 100) / 100 };
}

/** « 3.5/4 ⭐ », « 2,5 », « 1 / 1 » → 3.5, 2.5, 1 ; vide → null. */
export function parseScore(s: string | undefined): number | null {
  const m = /(-?\d+(?:[.,]\d+)?)/.exec(s ?? "");
  return m ? Number(m[1].replace(",", ".")) : null;
}

/** Grille en tableau : « | **1. Libellé** /4 | attendus | commentaires | ». */
export function parseTableGrid(body: string): GridCriterion[] {
  const rows = body.split(/^(?=\| \*\*\d+\.)/m).slice(1);
  return rows.map((row) => {
    const cells = row
      .split(/\n\s*\n/)[0]
      .split("|")
      .map((c) => c.trim());
    const head = (cells[1] ?? "").replace(/\*\*/g, "");
    const m = /^\s*\d+\.\s*(.+?)\s*\/\s*([\d.,]+)\s*$/.exec(head);
    return {
      label: cleanInline(m?.[1] ?? head),
      weight: Number((m?.[2] ?? "0").replace(",", ".")),
      description: (cells[2] ?? "").replace(/\n{2,}/g, "\n").trim(),
    };
  });
}

/**
 * Tableau de correction d'une page Notion (une ligne par critère) : note lue dans la
 * 1re cellule (« **1. …** 1.75/2 ») ou dans une colonne « Note », commentaire en dernière
 * colonne. Renvoie aussi la section « Commentaire global » si elle existe.
 */
export function parseCorrectionTable(body: string): {
  rows: { number: number; score: number | null; comment: string }[];
  global: string;
} {
  const rows = body
    .split(/^(?=\| \*\*\d+\.)/m)
    .slice(1)
    .map((row) => {
      // Une ligne de tableau peut s'étendre sur plusieurs lignes ; le tableau finit à la ligne vide.
      const cells = row
        .split(/\n\s*\n/)[0]
        .split("|")
        .map((c) => c.trim());
      const number = Number(/\*\*(\d+)\./.exec(cells[1] ?? "")?.[1]);
      const inHead = /\*\*\s*([\d.,]+)\s*\/\s*[\d.,]+\s*$/.exec(cells[1] ?? "");
      const inColumn = cells.length > 5 ? parseScore(cells[3]) : null;
      return {
        number,
        score: inHead ? Number(inHead[1].replace(",", ".")) : inColumn,
        comment: cleanInline(cells[cells.length - 2] ?? ""),
      };
    });
  const global = /^##\s*\**Commentaire global\**\s*$([\s\S]*)/m.exec(body)?.[1] ?? "";
  return { rows, global: global.split(/^---$/m)[0].trim() };
}
