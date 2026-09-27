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
