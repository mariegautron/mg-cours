/**
 * US-127 : le brief du projet fil rouge en sections libres. Stocké dans `brief_md` (Markdown : une
 * section = un titre `##` et son texte), donc sans nouvelle colonne et lisible partout où le brief
 * est déjà affiché. Fonctions pures : modèles de départ, lecture, écriture, déplacement.
 */
import { moveDown, moveUp } from "@/lib/modules/session-builder";

export interface BriefSection {
  title: string;
  body: string;
}

export type BriefModelKey = "client_role_play" | "several_themes" | "blank";

export interface BriefModel {
  key: BriefModelKey;
  label: string;
  hint: string;
  sections: BriefSection[];
}

export const BRIEF_MODELS: readonly BriefModel[] = [
  {
    key: "client_role_play",
    label: "Jeu de rôle client",
    hint: "Les étudiant·es répondent à un client fictif : contexte, besoin, contraintes, phases.",
    sections: [
      { title: "Le client", body: "Qui est le client, son activité, son besoin." },
      { title: "Ce qui est demandé", body: "Le livrable attendu, en une ou deux phrases." },
      { title: "Contraintes", body: "- Délai\n- Budget\n- Outils imposés" },
      { title: "Phases du projet", body: "1. Cadrage\n2. Réalisation\n3. Restitution" },
      { title: "Livrables", body: "- Rendu du jalon\n- Oral de fin de projet" },
    ],
  },
  {
    key: "several_themes",
    label: "Plusieurs thèmes au choix",
    hint: "Un cadre commun, puis chaque groupe travaille sur son thème (voir « Thèmes au choix »).",
    sections: [
      { title: "Présentation du projet", body: "Objectif général et fil conducteur." },
      { title: "Règles communes", body: "- Travail en groupe\n- Un thème par groupe" },
      { title: "Phases du projet", body: "1. Choix du thème\n2. Réalisation\n3. Restitution" },
      { title: "Évaluation", body: "Ce qui est évalué, et quand." },
    ],
  },
  {
    key: "blank",
    label: "Page blanche",
    hint: "Tu écris les sections que tu veux.",
    sections: [{ title: "Présentation du projet", body: "" }],
  },
];

/** Idées de sections à ajouter en un clic. */
export const SECTION_SUGGESTIONS = [
  "Contexte",
  "Objectifs",
  "Contraintes",
  "Phases du projet",
  "Livrables",
  "Critères d’évaluation",
  "Ressources",
] as const;

export const MAX_SECTIONS = 20;

export function modelByKey(key: string): BriefModel | undefined {
  return BRIEF_MODELS.find((m) => m.key === key);
}

/** Lit un brief Markdown en sections. Le texte avant le premier `##` devient « Présentation ». */
export function parseBrief(md: string): BriefSection[] {
  const text = md.replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  const sections: BriefSection[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let inCode = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inCode = !inCode;
    const heading = !inCode ? line.match(/^##\s+(.*\S)\s*#*\s*$/) : null;
    if (heading) {
      if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
      current = { title: heading[1].trim(), lines: [] };
    } else {
      current ??= { title: "Présentation", lines: [] };
      current.lines.push(line);
    }
  }
  if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
  return sections.filter((s) => s.title || s.body);
}

/** Dans le corps d'une section, un `##` serait pris pour une nouvelle section : on le descend d'un cran. */
function demote(body: string): string {
  let inCode = false;
  return body
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inCode = !inCode;
      return !inCode && /^##(\s|$)/.test(line) ? `#${line}` : line;
    })
    .join("\n");
}

/** Écrit les sections en Markdown (sections sans titre ni texte ignorées). */
export function serializeBrief(sections: readonly BriefSection[]): string {
  return sections
    .map((s) => ({ title: s.title.trim().replace(/\s+/g, " "), body: demote(s.body.trim()) }))
    .filter((s) => s.title || s.body)
    .map((s) => `## ${s.title || "Sans titre"}${s.body ? `\n\n${s.body}` : ""}`)
    .join("\n\n");
}

export function moveSection<T>(items: readonly T[], index: number, dir: "up" | "down"): T[] {
  return dir === "up" ? moveUp(items, index) : moveDown(items, index);
}

export function addSection(sections: readonly BriefSection[], title = ""): BriefSection[] {
  return sections.length >= MAX_SECTIONS ? [...sections] : [...sections, { title, body: "" }];
}

export function removeSection<T extends BriefSection>(sections: readonly T[], index: number): T[] {
  return sections.filter((_, i) => i !== index);
}

/** Section laissée telle que le modèle l'a posée (ou vide) : elle reste « à rédiger ». */
export function isPlaceholderSection(section: BriefSection): boolean {
  const body = section.body.trim();
  if (!body) return true;
  return BRIEF_MODELS.some((m) =>
    m.sections.some((s) => s.title === section.title.trim() && s.body.trim() === body),
  );
}

/** Première ligne utile du texte d'une section (puces et titres retirés), coupée à 110 caractères. */
export function sectionSummary(body: string): string {
  const first =
    body
      .split("\n")
      .map((l) =>
        l
          .replace(/^\s*(?:[-*+]|\d+[.)]|#+)\s*/, "")
          .replace(/\*\*/g, "")
          .trim(),
      )
      .find(Boolean) ?? "";
  return first.length > 110 ? `${first.slice(0, 109)}…` : first;
}

/** Vrai si le brief ne contient aucun texte (le choix du modèle est alors proposé d'emblée). */
export function isBriefEmpty(md: string): boolean {
  return parseBrief(md).every((s) => !s.body.trim());
}
