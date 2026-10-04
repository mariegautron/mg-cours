import { parseBrief, plainText } from "@/lib/projects/brief";

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

/** Nom de phase propre : sans marques Markdown ni ponctuation finale (« …du besoin ; », « Retrospective. »). */
export function cleanPhaseTitle(raw: string): string {
  return plainText(raw)
    .replace(/[\s;,.:·…\-–—]+$/, "")
    .trim();
}

const ITEM = /^\s*(?:\d+\s*[.)°]|[a-z]\)|[-*+•▪●◦])\s+(.+\S)\s*$/i;
const HEADING = /^\s{0,3}#{1,6}\s+(.*\S)\s*$/;

/** Lignes de la liste de phases : la section « Phases du projet », sinon un sous-titre « Phases… » dans une section. */
function phaseLines(briefMd: string): string[] {
  const sections = parseBrief(briefMd);
  const section = sections.find((s) => norm(s.title).includes("phase"));
  if (section) return section.body.split("\n");
  for (const s of sections) {
    const lines = s.body.split("\n");
    const at = lines.findIndex((l) => {
      const heading = HEADING.exec(l)?.[1] ?? "";
      return heading !== "" && norm(heading).includes("phase");
    });
    if (at === -1) continue;
    const rest = lines.slice(at + 1);
    const end = rest.findIndex((l) => HEADING.test(l));
    return end === -1 ? rest : rest.slice(0, end);
  }
  return [];
}

/**
 * Lit les phases dans la section « Phases du projet » du brief : une ligne de liste (numérotée ou à
 * puces) = une phase. « Cadrage — livrable : dossier » donne le titre et le livrable. Les marques
 * Markdown et la ponctuation finale sont retirées du nom.
 */
export function parsePhases(briefMd: string): ProjectPhase[] {
  const phases: ProjectPhase[] = [];
  for (const line of phaseLines(briefMd)) {
    const item = line.match(ITEM);
    if (!item) continue;
    const text = plainText(item[1]);
    const split = text.split(/\s+[—–-]\s+|\s*:\s*|\s*\(\s*/);
    const title = cleanPhaseTitle(split[0]);
    const rest = text
      .slice(split[0].length)
      .replace(/^[\s—–:(-]+/, "")
      .replace(/\)\s*$/, "")
      .replace(/^livrables?\s*:?\s*/i, "")
      .replace(/[\s;,.]+$/, "")
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
