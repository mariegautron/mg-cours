import type { Block, InlineRun } from "@/lib/pdf/markdown";

import { blockLines, slideTitle, type SlideSpec } from "./slides";

/**
 * Contrôle de qualité des diapos d'une fiche (aide à l'écriture, jamais bloquant). Fonctions pures :
 * elles lisent le découpage de `buildSlides` et signalent ce qui rendra mal en classe.
 */

export type LintCode =
  | "tiny"
  | "title-only"
  | "dense"
  | "heavy"
  | "topic-title"
  | "image-alt";

export interface LintWarning {
  code: LintCode;
  message: string;
}

/** Une fiche au-delà de ce nombre de diapos devient longue à projeter. */
export const LONG_DECK = 40;
export const TINY_WORDS = 4;
export const DENSE_WORDS = 60;

const runsText = (runs: InlineRun[]): string =>
  runs.map((r) => ("text" in r ? r.text : " ")).join("");

function blockText(block: Block): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "quote":
      return runsText(block.runs);
    case "list":
      return block.items
        .map((i) => `${runsText(i.runs)} ${i.children.map((c) => blockText(c)).join(" ")}`)
        .join(" ");
    case "table":
      return [...block.header, ...block.rows.flat()].map(runsText).join(" ");
    case "code":
      return block.text;
    case "callout":
      return block.blocks.map(blockText).join(" ");
    default:
      return "";
  }
}

export const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/** Titres qui nomment un sujet sans dire ce qu'il faut en retenir. */
const GENERIC_TITLE =
  /^(?:\d+(?:\.\d+)*\.?\s*)?(le but|but|objectif|questions?|correction|notions? cl[ée]s?|d[ée]finition|introduction|conclusion|contexte|exemples?|suite|rappel|principe)\s*$/i;

/** Un titre court, sans verbe ni ponctuation de phrase, qui ne pose pas de question. */
function isTopicTitle(title: string): boolean {
  if (/[?!:]/.test(title)) return false;
  const words = wordCount(title.replace(/^\d+(?:\.\d+)*\.?\s*/, ""));
  return GENERIC_TITLE.test(title.trim()) || (words > 0 && words <= 2);
}

export function lintSlide(spec: SlideSpec): LintWarning[] {
  const out: LintWarning[] = [];
  const text = spec.blocks.map(blockText).join(" ");
  const words = wordCount(text);
  const visual = spec.blocks.some((b) => b.type === "image" || b.type === "table");
  const title = slideTitle(spec.blocks);
  const onlyTitle = spec.blocks.length === 1 && spec.blocks[0].type === "heading";

  if (onlyTitle) {
    out.push({ code: "title-only", message: "Titre seul : ajoute le contenu ou fusionne." });
  } else if (!visual && words < TINY_WORDS) {
    out.push({ code: "tiny", message: `Seulement ${words} mot${words > 1 ? "s" : ""}.` });
  }
  if (words > DENSE_WORDS) {
    out.push({ code: "dense", message: `${words} mots : scinde en deux idées.` });
  }
  if (spec.blocks.reduce((n, b) => n + blockLines(b), 0) > 12 && !visual) {
    out.push({ code: "heavy", message: "Trop de lignes pour l'écran : il faudra défiler." });
  }
  if (title && !spec.role && isTopicTitle(title)) {
    out.push({
      code: "topic-title",
      message: "Titre-sujet : essaie une question ou une affirmation.",
    });
  }
  for (const b of spec.blocks) {
    if (b.type === "image" && (!b.alt.trim() || /\.(png|jpe?g|gif|svg|webp)$/i.test(b.alt.trim()))) {
      out.push({ code: "image-alt", message: "Image sans texte alternatif décrivant le schéma." });
    }
  }
  return out;
}

export interface DeckLint {
  /** Avertissements de chaque diapo, dans l'ordre. */
  slides: LintWarning[][];
  /** Avertissements sur la fiche entière. */
  deck: string[];
}

export function lintSlides(specs: SlideSpec[]): DeckLint {
  const deck: string[] = [];
  if (specs.length > LONG_DECK) {
    deck.push(`${specs.length} diapos : au-delà de ${LONG_DECK}, pense à scinder la fiche.`);
  }
  return { slides: specs.map(lintSlide), deck };
}
