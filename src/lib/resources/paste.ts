import type { Block, InlineRun } from "@/lib/pdf/markdown";
import { parseMarkdown } from "@/lib/pdf/markdown";
import { buildSlides, slideTitle } from "@/lib/present/slides";

/**
 * US-152 : nettoyage d'un texte collé (Notion, Word, pages web) avant qu'il entre dans la
 * ressource, et aperçu des diapositives que ce contenu produira. Fonctions pures.
 */

const ZERO_WIDTH = /[​-‍⁠﻿­]/g;
// Puces de Word / Notion / PDF : • ‣ ◦ ▪ ▫ ● ○ ■ □ · ○ (o seul suivi d'une tabulation) …
const BULLET = /^(\s*)[•‣◦▪▫●○■□·–—▸►➢➤✓✔]\s+/;
const WORD_O_BULLET = /^(\s*)o\t+/;
const NUMBERED = /^(\s*)(\d+)[)\]]\s+/;

/** Texte collé → Markdown propre : espaces insécables, puces typographiques, listes numérotées, blancs. */
export function cleanPaste(input: string): string {
  const lines = input
    .replace(/\r\n?/g, "\n")
    .replace(ZERO_WIDTH, "")
    .replace(/ /g, " ")
    .split("\n")
    .map((raw) => {
      let line = raw.replace(/\t+$/, "").replace(/[ \t]+$/, "");
      if (BULLET.test(line)) {
        line = line.replace(BULLET, (_, indent: string) => `${indent.replace(/\t/g, "  ")}- `);
      } else if (WORD_O_BULLET.test(line)) {
        line = line.replace(
          WORD_O_BULLET,
          (_, indent: string) => `${indent.replace(/\t/g, "  ")}  - `,
        );
      } else if (NUMBERED.test(line)) {
        line = line.replace(NUMBERED, (_, indent: string, n: string) => `${indent}${n}. `);
      }
      // Tabulations de début → indentation de liste (2 espaces par tabulation).
      return line.replace(/^\t+/, (t) => "  ".repeat(t.length));
    });
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
}

/** Insère `pasted` à la place de la sélection `[start, end[` ; renvoie le texte et la position du curseur. */
export function insertAtSelection(
  text: string,
  start: number,
  end: number,
  pasted: string,
): { text: string; cursor: number } {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  return { text: text.slice(0, s) + pasted + text.slice(e), cursor: s + pasted.length };
}

export interface SlidePreview {
  number: number;
  title: string | null;
  /** Début du texte de la diapo (une ligne), vide si la diapo n'a que des éléments non textuels. */
  summary: string;
  /** Éléments non textuels présents (image, tableau, code). */
  extras: ("image" | "table" | "code")[];
}

const runsText = (runs: InlineRun[]) => runs.map((r) => ("text" in r ? r.text : " ")).join("");

function firstText(blocks: Block[]): string {
  for (const b of blocks) {
    if (b.type === "paragraph" || b.type === "quote") return runsText(b.runs).trim();
    if (b.type === "list")
      return b.items
        .map((i) => runsText(i.runs).trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" · ");
  }
  return "";
}

/** Diapositives que produira ce Markdown en présentation (même découpage que la projection). */
export function slidePreviews(source: string): SlidePreview[] {
  if (!source.trim()) return [];
  return buildSlides(parseMarkdown(source)).map((spec, i) => {
    const extras = new Set<SlidePreview["extras"][number]>();
    for (const b of spec.blocks) {
      if (b.type === "image" || b.type === "table" || b.type === "code") extras.add(b.type);
    }
    const summary = firstText(spec.blocks);
    return {
      number: i + 1,
      title: slideTitle(spec.blocks) ?? spec.reminder,
      summary: summary.length > 140 ? `${summary.slice(0, 137)}…` : summary,
      extras: [...extras],
    };
  });
}
