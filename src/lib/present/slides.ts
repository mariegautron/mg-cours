import type { Block, InlineRun } from "@/lib/pdf/markdown";

/**
 * Découpage automatique d'un contenu Markdown (déjà parsé) en diapositives de projection (US-133).
 *
 * - `---` ferme toujours la diapo courante (prioritaire) ; `#` et `##` ouvrent une section ;
 *   chaque sous-titre (`###` et suivants) ouvre aussi sa diapo.
 * - Une image, un tableau ou un bloc de code a sa propre diapo (avec le titre de la section en
 *   rappel) ; si un titre vient juste avant, il l'accompagne.
 * - Un contenu trop long est coupé entre deux éléments de liste ou deux phrases, jamais au milieu
 *   d'une liste, d'un tableau, d'un bloc de code ni d'une phrase.
 * - Un long bloc de code est coupé en tranches d'environ 12 lignes ; chaque tranche porte son rang
 *   (« suite 2/3 »).
 * Les diapos vides sont ignorées.
 */

/** Lignes de texte (estimées) qu'une diapo peut porter avant d'être coupée. */
export const MAX_SLIDE_LINES = 11;
/** Caractères par ligne de texte projeté (estimation grossière, sert au seuil). */
export const CHARS_PER_LINE = 70;
/** Taille visée d'une tranche de code. */
export const CODE_SLICE_LINES = 12;

export interface SlideSpec {
  blocks: Block[];
  /** Titre de la section, en rappel discret, quand la diapo n'ouvre pas sa section. */
  reminder: string | null;
  /** Rang de la tranche quand un bloc de code est coupé (`index` à partir de 1). */
  part: { index: number; total: number } | null;
}

const runsText = (runs: InlineRun[]): string =>
  runs.map((r) => ("text" in r ? r.text : " ")).join("");

const lines = (chars: number, perLine = CHARS_PER_LINE) => Math.max(1, Math.ceil(chars / perLine));

function listLines(list: Extract<Block, { type: "list" }>): number {
  return list.items.reduce(
    (n, item) =>
      n +
      lines(runsText(item.runs).length, CHARS_PER_LINE - 6) +
      item.children.reduce((m, c) => m + listLines(c), 0),
    0,
  );
}

/** Hauteur estimée d'un bloc, en lignes. */
export function blockLines(block: Block): number {
  switch (block.type) {
    case "heading":
      return 1;
    case "paragraph":
    case "quote":
      return lines(runsText(block.runs).length);
    case "list":
      return listLines(block);
    case "code":
      return block.text.split("\n").length;
    case "table":
      return block.rows.length + 1;
    case "callout":
      return block.blocks.reduce((n, b) => n + blockLines(b), 0);
    case "image":
      return MAX_SLIDE_LINES;
    case "hr":
      return 0;
  }
}

const STANDALONE = new Set<Block["type"]>(["image", "table", "code"]);

/** Découpe une liste entre ses éléments, sans jamais en couper un. */
function splitList(list: Extract<Block, { type: "list" }>): Block[] {
  if (listLines(list) <= MAX_SLIDE_LINES) return [list];
  const chunks: Block[] = [];
  let items: typeof list.items = [];
  let n = 0;
  for (const item of list.items) {
    const w = listLines({ ...list, items: [item] });
    if (items.length && n + w > MAX_SLIDE_LINES) {
      chunks.push({ ...list, items });
      items = [];
      n = 0;
    }
    items.push(item);
    n += w;
  }
  if (items.length) chunks.push({ ...list, items });
  return chunks;
}

/** Découpe un paragraphe (ou une citation) entre deux phrases. */
function splitText(block: Extract<Block, { type: "paragraph" | "quote" }>): Block[] {
  if (blockLines(block) <= MAX_SLIDE_LINES) return [block];
  const budget = MAX_SLIDE_LINES * CHARS_PER_LINE;
  // Segments : une phrase (avec sa mise en forme) ou un saut de ligne.
  const segments: InlineRun[][] = [];
  let sentence: InlineRun[] = [];
  const closeSentence = () => {
    if (sentence.length) segments.push(sentence);
    sentence = [];
  };
  for (const run of block.runs) {
    if (!("text" in run)) {
      sentence.push(run);
      continue;
    }
    const parts = run.text.split(/(?<=[.!?…])\s+/);
    parts.forEach((part, i) => {
      if (i > 0) closeSentence();
      if (part) sentence.push({ ...run, text: i < parts.length - 1 ? `${part} ` : part });
    });
  }
  closeSentence();

  const pieces: InlineRun[][] = [];
  let piece: InlineRun[] = [];
  let chars = 0;
  for (const seg of segments) {
    const w = runsText(seg).length;
    if (piece.length && chars + w > budget) {
      pieces.push(piece);
      piece = [];
      chars = 0;
    }
    piece.push(...seg);
    chars += w;
  }
  if (piece.length) pieces.push(piece);
  return pieces.map((runs) => ({ ...block, runs }));
}

/** Tranches d'environ `CODE_SLICE_LINES` lignes, de tailles voisines (pas de dernière tranche d'une ligne). */
export function sliceCode(text: string): string[] {
  const all = text.split("\n");
  if (all.length <= CODE_SLICE_LINES + 2) return [text];
  const count = Math.ceil(all.length / CODE_SLICE_LINES);
  const size = Math.ceil(all.length / count);
  const out: string[] = [];
  for (let i = 0; i < all.length; i += size) out.push(all.slice(i, i + size).join("\n"));
  return out;
}

export function buildSlides(blocks: Block[]): SlideSpec[] {
  const specs: SlideSpec[] = [];
  let section: string | null = null;
  let current: Block[] = [];
  let used = 0;

  const headingOnly = () => current.length === 1 && current[0].type === "heading";

  const flush = (part: SlideSpec["part"] = null) => {
    if (current.length) {
      const first = current[0];
      const opensSection = first.type === "heading" && first.level <= 2;
      specs.push({
        blocks: current,
        reminder: opensSection ? null : section,
        part,
      });
    }
    current = [];
    used = 0;
  };

  const pushStandalone = (block: Block) => {
    const slices = block.type === "code" ? sliceCode(block.text) : [null];
    const total = slices.length;
    slices.forEach((text, i) => {
      const piece: Block = text === null ? block : { type: "code", text };
      if (i === 0 && headingOnly()) {
        current.push(piece);
      } else {
        flush();
        current = [piece];
      }
      flush(total > 1 ? { index: i + 1, total } : null);
    });
  };

  for (const block of blocks) {
    if (block.type === "hr") {
      flush();
    } else if (block.type === "heading") {
      flush();
      if (block.level <= 2) section = runsText(block.runs).trim() || null;
      current = [block];
      used = 1;
    } else if (STANDALONE.has(block.type)) {
      pushStandalone(block);
    } else {
      const pieces =
        block.type === "list"
          ? splitList(block)
          : block.type === "paragraph" || block.type === "quote"
            ? splitText(block)
            : [block];
      for (const piece of pieces) {
        const w = blockLines(piece);
        if (current.length && !headingOnly() && used + w > MAX_SLIDE_LINES) flush();
        current.push(piece);
        used += w;
      }
    }
  }
  flush();
  return specs;
}

/** Les blocs de chaque diapo (sans rappel ni rang de tranche). */
export function splitSlides(blocks: Block[]): Block[][] {
  return buildSlides(blocks).map((s) => s.blocks);
}

/** Texte brut d'un titre de diapo (sommaire, annonce « Diapositive n sur N »). */
export function slideTitle(slide: Block[]): string | null {
  const first = slide[0];
  if (first?.type !== "heading") return null;
  return runsText(first.runs).trim() || null;
}
