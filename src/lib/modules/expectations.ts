/**
 * US-53 : attendus de la fiche YNOV. Fonctions pures : objectifs pédagogiques du module et
 * objectif de chaque unité pédagogique. Les unités (modalité FFP/TDP, heures) ne sont que des
 * repères : seul le total d'heures du module est contraignant.
 */

export type ExpectationKind = "objective" | "unit";
export type Modality = "FFP" | "TDP";

export interface ExpectationDraft {
  kind: ExpectationKind;
  label: string;
  hours: number | null;
  modality: Modality | null;
}

const MAX_LABEL = 1000;

const UNITS_HEADING = /unit[ée]s?\s+p[ée]dagogiques?/i;
const OBJECTIVES_HEADING = /objectifs?\s+p[ée]dagogiques?(?:\s+du\s+module)?\s*:?/i;
/** Titres qui closent la section des objectifs. */
const SECTION_END =
  /(?:^|\n)\s*(?:unit[ée]s?\s+p[ée]dagogiques?|[ée]valuation|modalit[ée]s?|pr[ée]requis|comp[ée]tences|contenu|bibliographie|dur[ée]es?\s+totales?|volume\s+heures?)\b/i;
const BULLET = /^[\s]*(?:[-•*·▪●◦–—]|\d{1,2}\s*[.)])\s+/;

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

const cap = (label: string) => (label.length > MAX_LABEL ? label.slice(0, MAX_LABEL) : label);

function objective(label: string): ExpectationDraft {
  return { kind: "objective", label: cap(label), hours: null, modality: null };
}

/** Une ligne = un attendu ; puces et numéros retirés, lignes vides ignorées. */
export function parseExpectationLines(text: string): ExpectationDraft[] {
  return text
    .split(/\r?\n/)
    .map((l) => oneLine(l.replace(BULLET, "")))
    .filter((l) => l.length >= 3)
    .map(objective);
}

/** Découpe une section d'objectifs en puces, en recollant les retours à la ligne du PDF. */
function splitObjectives(section: string): string[] {
  const lines = section
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim());
  if (lines.length === 1) {
    // PDF fusionné : puces (« • », « - ») ou phrases.
    const one = lines[0];
    const bullets = one
      .split(/(?:^|\s+)(?:[•▪●◦]|[-–—])\s+/)
      .map(oneLine)
      .filter(Boolean);
    if (bullets.length > 1 || /^\s*(?:[•▪●◦]|[-–—])\s/.test(one)) return bullets;
    return one
      .split(/(?<=[.;])\s+(?=[A-ZÀ-Ý])/)
      .map(oneLine)
      .filter(Boolean);
  }
  const items: string[] = [];
  for (const line of lines) {
    if (BULLET.test(line) || items.length === 0 || /[.;:]$/.test(items[items.length - 1])) {
      items.push(line.replace(BULLET, ""));
    } else {
      // Ligne de continuation d'une puce coupée par la mise en page.
      items[items.length - 1] += ` ${line.trim()}`;
    }
  }
  return items.map(oneLine).filter(Boolean);
}

function readObjectives(text: string): ExpectationDraft[] {
  const heading = OBJECTIVES_HEADING.exec(text);
  if (!heading) return [];
  const after = text.slice(heading.index + heading[0].length);
  // Titre de section en début de ligne ; « Unités pédagogiques » coupe aussi en plein texte
  // (PDF fusionné sans retour à la ligne).
  const cuts = [SECTION_END.exec(after)?.index, UNITS_HEADING.exec(after)?.index].filter(
    (i): i is number => i !== undefined,
  );
  const section = cuts.length ? after.slice(0, Math.min(...cuts)) : after;
  return splitObjectives(section)
    .filter((l) => l.length >= 3)
    .map(objective);
}

/** En-tête de tableau répété par le PDF à chaque page : « # Modalité VH Objectifs UP Projet lié … ». */
const TABLE_HEADER =
  /#\s*Modalit[ée]\s+VH\s+Objectifs?\s+UP(?:\s+Projet\s+li[ée])?(?:\s+Description\s*\/?\s*Livrable)?(?:\s+Syllabus(?:\s+capsule)?)?/gi;
/** Colonnes vides du tableau (« Néant Néant Néant ») en fin de ligne. */
const EMPTY_COLUMNS = /(?:\s*\b(?:N[ée]ant|N\/A)\b)+\s*$/i;
/** Marqueur de puce au milieu d'un texte fusionné : « • », « - », « – ». */
const INLINE_BULLET = /(?:^|\s+)(?:[•▪●◦]|[-–—])\s+/;

/** Texte d'un attendu débarrassé des restes du tableau de la fiche (en-tête répété, colonnes vides). */
export function cleanExpectationLabel(raw: string): string {
  return oneLine(raw.replace(TABLE_HEADER, " ").replace(EMPTY_COLUMNS, ""));
}

/** Mots qui ouvrent une nouvelle ligne de liste (« Les rôles… », « Un atelier… »). */
const LINE_STARTERS = new Set(["le", "la", "les", "l'", "l’", "des", "un", "une", "du"]);
/** Mots qui ne terminent jamais une ligne : le mot suivant en fait partie (« de Scrum »). */
const CONNECTORS = new Set([
  "de",
  "d'",
  "d’",
  "du",
  "des",
  "en",
  "et",
  "à",
  "au",
  "aux",
  "la",
  "le",
  "les",
  "l'",
  "l’",
  "un",
  "une",
  "pour",
  "sur",
  "avec",
  "vs",
  "par",
  "dans",
  "ou",
  "sans",
  "entre",
  "selon",
]);
/** Noms propres du domaine qui prennent une majuscule au milieu d'une ligne. */
const PROPER_NOUNS = new Set([
  "agile",
  "scrum",
  "kanban",
  "xp",
  "safe",
  "jira",
  "trello",
  "git",
  "github",
  "gitlab",
  "product",
  "owner",
  "master",
  "backlog",
  "sprint",
  "figma",
  "docker",
  "linux",
  "web",
]);
const RUN_ON_MIN_LENGTH = 50;

const bare = (word: string) => word.toLowerCase().replace(/[:;,.()]/g, "");

/**
 * Lignes d'une liste que l'extraction du PDF a collées sur une seule : « Création d'un backlog
 * produit Construction d'un board Scrum ». On coupe devant un déterminant (« Les », « Un »…) ou
 * devant un mot à majuscule qui suit un mot en minuscules ; jamais après un mot de liaison, jamais
 * devant un nom propre connu, jamais pour un fragment de moins de deux mots. Heuristique : le texte
 * court (moins de 50 caractères) reste entier, et l'aperçu avant application laisse corriger.
 */
function splitRunOnLines(text: string): string[] {
  if (text.length < RUN_ON_MIN_LENGTH) return [text];
  const words = text.split(" ");
  const lines: string[][] = [[]];
  words.forEach((word, i) => {
    const prev = words[i - 1];
    const current = lines[lines.length - 1];
    const capital = /^[A-ZÀ-Ý]/.test(word);
    const starter = LINE_STARTERS.has(bare(word)) || /^[LD][’']/.test(word);
    const cut =
      i > 0 &&
      current.length >= 2 &&
      capital &&
      !CONNECTORS.has(bare(prev)) &&
      !/[,;]$/.test(prev) &&
      !PROPER_NOUNS.has(bare(word)) &&
      (starter || /^[a-zà-ÿ]/.test(prev));
    if (cut) lines.push([word]);
    else current.push(word);
  });
  // Un fragment d'un seul mot appartient à la ligne d'avant (« … Scrum »).
  const merged: string[][] = [];
  for (const line of lines) {
    if (line.length < 2 && merged.length) merged[merged.length - 1].push(...line);
    else merged.push(line);
  }
  return merged.map((l) => l.join(" "));
}

/**
 * Découpe un attendu qui en contient plusieurs : le titre d'abord (sans « : »), puis un élément par
 * puce ; un retour à la ligne suivi d'une majuscule sépare aussi deux éléments (liste du PDF sans
 * puces). `[label]` quand il n'y a rien à découper.
 */
export function splitExpectationLabel(raw: string): string[] {
  const text = raw
    .replace(TABLE_HEADER, " ")
    .replace(/\r\n?/g, "\n")
    .replace(EMPTY_COLUMNS, "")
    .replace(/\n+(?=[A-ZÀ-Ý])/g, "\n");
  const parts = text
    .split("\n")
    .flatMap((line) => line.split(INLINE_BULLET))
    .map((p) => oneLine(p).replace(/\s*:\s*$/, ""))
    .filter((p) => p.length >= 3)
    .flatMap(splitRunOnLines);
  return parts.length > 1 ? parts : [cleanExpectationLabel(raw)].filter(Boolean);
}

export interface SplitPlan {
  id: string;
  kind: ExpectationKind;
  /** Libellé actuel. */
  label: string;
  /** Titre conservé (le premier fragment garde l'identité et les liens) puis les nouveaux attendus. */
  parts: string[];
}

/** « Découper les attendus trop longs » : ce qui serait scindé, sans rien modifier. */
export function planExpectationSplits(
  expectations: { id: string; kind: ExpectationKind; label: string }[],
): SplitPlan[] {
  return expectations.flatMap((e) => {
    const parts = splitExpectationLabel(e.label);
    return parts.length > 1 ? [{ id: e.id, kind: e.kind, label: e.label, parts }] : [];
  });
}

const UNIT_ROW = /(?:^|\s)(\d{1,2})\s*[.)]?\s+(FFP|TDP)\s+(\d{1,3}(?:[.,]\d)?)\s*h(?:eures?)?\b/gi;

/** Lignes du tableau des unités : « 1 FFP 3h Cadrage du besoin ». */
function readUnits(text: string): ExpectationDraft[] {
  const heading = UNITS_HEADING.exec(text);
  if (!heading) return [];
  const table = text.slice(heading.index + heading[0].length);
  const rows = [...table.matchAll(UNIT_ROW)];
  return rows.flatMap((row, i) => {
    const start = row.index + row[0].length;
    const end = i + 1 < rows.length ? rows[i + 1].index : table.length;
    const raw = table.slice(start, end);
    // Un titre suivi d'une liste à puces : le titre est l'unité, chaque puce un objectif à part.
    const hasBullets = INLINE_BULLET.test(raw.replace(TABLE_HEADER, " "));
    const parts = hasBullets ? splitExpectationLabel(raw) : [cleanExpectationLabel(raw)];
    const [title, ...bullets] = parts;
    return [
      {
        kind: "unit" as const,
        label: cap(title || `Unité ${row[1]}`),
        hours: Number(row[3].replace(",", ".")),
        modality: row[2].toUpperCase() as Modality,
      },
      ...bullets.map(objective),
    ];
  });
}

/** Attendus lus dans le texte d'une fiche : objectifs du module, puis une entrée par unité. */
export function parseExpectationsFromFiche(text: string): ExpectationDraft[] {
  const clean = text.replace(/\r\n?/g, "\n").replace(/[  ]/g, " ");
  return [...readObjectives(clean), ...readUnits(clean)];
}

/** Attendus lus dans un texte : fiche complète si on y trouve des objectifs/unités, sinon une ligne par attendu. */
export function draftsFromText(text: string): ExpectationDraft[] {
  const fromFiche = parseExpectationsFromFiche(text);
  return fromFiche.length ? fromFiche : parseExpectationLines(text);
}

export interface SkeletonSession {
  title: string;
  objective: string;
}

const MAX_TITLE = 80;

/**
 * « Proposer un squelette de séances depuis les unités » : une séance vide par unité, titrée
 * d'après son objectif. Repère indicatif, entièrement modifiable ensuite.
 */
export function unitsToSkeleton(
  units: { kind: ExpectationKind; label: string }[],
): SkeletonSession[] {
  return units
    .filter((u) => u.kind === "unit")
    .map((u) => ({
      title: u.label.length > MAX_TITLE ? `${u.label.slice(0, MAX_TITLE - 1).trimEnd()}…` : u.label,
      objective: u.label,
    }));
}

/** Total des heures des unités — indicatif, jamais comparé au volume du module. */
export function unitsHours(units: { kind: ExpectationKind; hours: number | null }[]): number {
  return units.reduce((sum, u) => sum + (u.kind === "unit" ? (u.hours ?? 0) : 0), 0);
}
