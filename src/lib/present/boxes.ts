import type { Block, InlineRun } from "@/lib/pdf/markdown";

/**
 * Encadrés d'une fiche, reconnus à partir des titres qu'elle utilise déjà : le mot déclencheur
 * ouvre le titre, sinon rien. Fonction pure, sans effet sur le texte.
 */
export type BoxKind = "trap" | "example" | "recap" | "grid" | "priority";

const TRIGGERS: [RegExp, BoxKind][] = [
  [/^essentiel, ou pour aller plus loin/i, "priority"],
  [/^(erreurs?\b|à éviter|pièges?\b|le piège|cinq erreurs)/i, "trap"],
  [/^(exemple\b|fil conducteur|appliqué à|atelier réparons)/i, "example"],
  [/^à retenir/i, "recap"],
  [/^ce que dit la grille/i, "grid"],
];

export const plainText = (runs: InlineRun[]): string =>
  runs.map((r) => ("text" in r ? r.text : " ")).join("");

export function boxKind(title: string): BoxKind | null {
  const t = title.trim();
  return TRIGGERS.find(([re]) => re.test(t))?.[1] ?? null;
}

/** Plus haut niveau de titre d'un contenu (les fiches commencent à « ## »). */
export function topLevel(blocks: readonly Block[]): number {
  const levels = blocks.flatMap((b) => (b.type === "heading" ? [b.level] : []));
  return levels.length ? Math.min(...levels) : 1;
}

export interface Segment {
  /** `null` : blocs affichés tels quels. */
  box: BoxKind | null;
  /** Index des blocs d'origine : les ancres du sommaire n'en dépendent pas du regroupement. */
  indexes: number[];
}

/**
 * Regroupe un titre de diapo (sous le niveau des parties) et ce qui le suit jusqu'au prochain
 * titre ou séparateur. Les titres de partie ne sont jamais encadrés : pas d'encadrés imbriqués.
 */
export function segments(blocks: readonly Block[]): Segment[] {
  const top = topLevel(blocks);
  const out: Segment[] = [];
  let open: Segment | null = null;
  blocks.forEach((block, i) => {
    if (block.type === "heading" || block.type === "hr") open = null;
    const box =
      block.type === "heading" && block.level > top ? boxKind(plainText(block.runs)) : null;
    if (box) {
      open = { box, indexes: [i] };
      out.push(open);
    } else if (open) {
      open.indexes.push(i);
    } else {
      out.push({ box: null, indexes: [i] });
    }
  });
  return out;
}
