import type { Block } from "@/lib/pdf/markdown";

/**
 * Découpe un contenu Markdown (déjà parsé) en diapositives pour le mode présentation :
 * un séparateur `---` ferme la diapo courante, un titre `#` ou `##` en ouvre une nouvelle.
 * Les diapos vides (séparateurs consécutifs, titre en tout début) sont ignorées.
 */
export function splitSlides(blocks: Block[]): Block[][] {
  const slides: Block[][] = [];
  let current: Block[] = [];

  const flush = () => {
    if (current.length) slides.push(current);
    current = [];
  };

  for (const block of blocks) {
    if (block.type === "hr") {
      flush();
    } else if (block.type === "heading" && block.level <= 2) {
      flush();
      current.push(block);
    } else {
      current.push(block);
    }
  }
  flush();
  return slides;
}

/** Texte brut d'un titre de diapo (sommaire, annonce « Diapositive n sur N »). */
export function slideTitle(slide: Block[]): string | null {
  const first = slide[0];
  if (first?.type !== "heading") return null;
  return (
    first.runs
      .map((r) => ("text" in r ? r.text : " "))
      .join("")
      .trim() || null
  );
}
