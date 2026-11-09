/**
 * Parties d'un cours (sections `##`) choisies par séance : une seule ressource partagée, chaque
 * séance n'en montre que certaines parties. Fonctions pures.
 */
import { parseMarkdown } from "@/lib/pdf/markdown";
import { buildSlides } from "@/lib/present/slides";

export interface CourseSection {
  title: string;
  /** Diapos de la partie (même découpage que la projection). */
  slides: number;
}

interface Chunk {
  title: string | null;
  text: string;
}

/** Découpe le Markdown en un préambule (avant le premier `##`) puis une partie par `##`. */
function chunks(content: string): Chunk[] {
  const out: Chunk[] = [{ title: null, text: "" }];
  let fence = false;
  for (const line of content.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^```/.test(line)) fence = !fence;
    const m = !fence ? /^##\s+(.+?)\s*#*\s*$/.exec(line) : null;
    if (m) out.push({ title: m[1].trim(), text: `${line}\n` });
    else out[out.length - 1].text += `${line}\n`;
  }
  return out;
}

/** Parties du cours, dans l'ordre, avec leur nombre de diapos. */
export function listSections(content: string | null): CourseSection[] {
  if (!content) return [];
  return chunks(content)
    .filter((c): c is Chunk & { title: string } => c.title !== null)
    .map((c) => ({ title: c.title, slides: buildSlides(parseMarkdown(c.text)).length }));
}

/** Contenu réduit aux parties choisies (le préambule est gardé) ; `null` = tout le cours. */
export function filterSections(content: string | null, selected: string[] | null): string | null {
  if (!content || !selected) return content;
  const keep = new Set(selected);
  return chunks(content)
    .filter((c) => c.title === null || keep.has(c.title))
    .map((c) => c.text)
    .join("")
    .replace(/\n+$/, "\n");
}

/** Ce qui a bougé dans le cours depuis le choix : nouvelles parties, parties choisies disparues. */
export function sectionChanges(
  content: string | null,
  selected: string[] | null,
  known: string[] | null,
): { added: string[]; missing: string[] } {
  if (!selected) return { added: [], missing: [] };
  const now = listSections(content).map((s) => s.title);
  const knownSet = new Set(known ?? selected);
  return {
    added: now.filter((t) => !knownSet.has(t)),
    missing: selected.filter((t) => !now.includes(t)),
  };
}
