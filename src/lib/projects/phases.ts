import { parseBrief } from "@/lib/projects/brief";

/** Une phase du projet, lue dans la section « Phases du projet » du brief. */
export interface ProjectPhase {
  title: string;
  /** Livrable annoncé pour la phase (« Dossier de cadrage »), s'il y en a un. */
  deliverable: string | null;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Lit les phases dans la section « Phases du projet » du brief : une ligne de liste (numérotée ou à
 * puces) = une phase. « Cadrage — livrable : dossier » donne le titre et le livrable.
 */
export function parsePhases(briefMd: string): ProjectPhase[] {
  const section = parseBrief(briefMd).find((s) => norm(s.title).includes("phase"));
  if (!section) return [];
  const phases: ProjectPhase[] = [];
  for (const line of section.body.split("\n")) {
    const item = line.match(/^\s*(?:\d+[.)]|[-*+])\s+(.+\S)\s*$/);
    if (!item) continue;
    const text = item[1].replace(/\*\*/g, "").trim();
    const split = text.split(/\s+[—–-]\s+|\s*:\s*|\s*\(\s*/);
    const title = split[0].trim();
    const rest = text
      .slice(split[0].length)
      .replace(/^[\s—–:(-]+/, "")
      .replace(/\)\s*$/, "")
      .replace(/^livrables?\s*:?\s*/i, "")
      .trim();
    if (title) phases.push({ title: title.slice(0, 200), deliverable: rest || null });
  }
  return phases;
}

/** L'évaluation du projet qui porte cette phase : même titre, ou l'un contient l'autre. */
export function assessmentForPhase<T extends { id: string; title: string }>(
  phase: ProjectPhase,
  assessments: T[],
): T | null {
  const p = norm(phase.title);
  if (!p) return null;
  return (
    assessments.find((a) => norm(a.title) === p) ??
    assessments.find((a) => {
      const t = norm(a.title);
      return t.length > 3 && (t.includes(p) || p.includes(t));
    }) ??
    null
  );
}
