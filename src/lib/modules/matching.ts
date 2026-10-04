import { excerptForTerms, type SearchExcerpt } from "@/lib/resources/search";

/**
 * US-54 : rapprochement attendus ↔ ressources. Mots-clés en commun, sans IA : insensible aux
 * accents et à la casse, mots vides ignorés, pluriels simples ramenés au singulier.
 */

const STOP_WORDS = new Set(
  (
    "a afin ainsi alors au aux avec ce ces cet cette dans de des du elle elles en et est etre " +
    "il ils je la le les leur leurs lui mais me mes moi mon ne nos notre nous on ou par pas pour " +
    "que qui sa se ses si son sur ta te tes toi ton tu un une vos votre vous comme cela ceci " +
    "sont ete fait faire peut plus moins tout tous toute toutes entre sans sous vers chez " +
    "doit doivent permet permettre savoir ainsi lors selon dont"
  ).split(" "),
);

const MIN_LENGTH = 3;

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("x")) return word.slice(0, -1);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** Mots-clés distincts d'un texte : minuscules, sans accents, sans mots vides ni mots trop courts. */
export function keywords(text: string): string[] {
  const words = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= MIN_LENGTH && !STOP_WORDS.has(w))
    .map(stem);
  return [...new Set(words)];
}

export interface MatchableResource {
  id: string;
  title: string;
  tags: string[];
  content: string | null;
  description?: string | null;
}

export interface ResourceMatch<R> {
  resource: R;
  /** Mots-clés de l'attendu retrouvés dans la ressource. */
  shared: string[];
  score: number;
  /** US-56 : extrait (tag, description ou contenu) où figure un mot commun. */
  excerpt: SearchExcerpt | null;
  /** US-153 : où chaque mot commun a été retrouvé (au meilleur endroit : tag > titre > description > contenu). */
  where: Record<MatchField, string[]>;
  /** US-153 : niveau de correspondance et score sur 100, relatifs aux mots-clés de l'attendu. */
  level: MatchLevel;
  percent: number;
  /** Raison en une phrase. */
  reason: string;
}

export type MatchField = "tag" | "title" | "description" | "content";
export type MatchLevel = "strong" | "medium" | "weak";

export const MATCH_LEVEL_LABELS: Record<MatchLevel, string> = {
  strong: "Convient bien",
  medium: "Convient en partie",
  weak: "À vérifier",
};

const FIELD_LABELS: Record<MatchField, string> = {
  tag: "les tags",
  title: "le titre",
  description: "la description",
  content: "le contenu",
};

/** Score sur 100 : part du score maximal possible (tous les mots de l'attendu retrouvés dans les tags). */
export function matchPercent(score: number, wantedCount: number): number {
  if (wantedCount <= 0) return 0;
  return Math.min(100, Math.round((score / (wantedCount * WEIGHTS.tag)) * 100));
}

/** Fort dès 50 %, moyen dès 25 %, faible en dessous. */
export function matchLevel(percent: number): MatchLevel {
  return percent >= 50 ? "strong" : percent >= 25 ? "medium" : "weak";
}

/** « Mots de l'attendu retrouvés dans les tags (agile) et le contenu (sprint). » */
export function matchReason(where: Record<MatchField, string[]>): string {
  const parts = (Object.keys(FIELD_LABELS) as MatchField[])
    .filter((f) => where[f].length > 0)
    .map((f) => `${FIELD_LABELS[f]} (${where[f].join(", ")})`);
  if (parts.length === 0) return "Aucun mot commun.";
  const joined =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
  return `Mots de l’attendu retrouvés dans ${joined}.`;
}

/** Poids d'un mot-clé retrouvé : tag > titre > description > contenu. */
const WEIGHTS = { tag: 4, title: 3, description: 2, content: 1 } as const;

/** Score minimal pour proposer une ressource : un mot du titre ou des tags, ou deux mots du contenu. */
const MIN_SCORE = 2;

/** Nombre de caractères de contenu lus par ressource. */
const CONTENT_LIMIT = 4000;

interface PreparedWords {
  tags: Set<string>;
  title: Set<string>;
  description: Set<string>;
  content: Set<string>;
}

/**
 * Mots-clés de chaque champ d'une ressource, calculés une seule fois : avec 150 ressources et une
 * vingtaine d'attendus, relire et découper tous les contenus pour chaque attendu rendait les pages
 * du module lentes (plusieurs secondes).
 */
const prepared = new WeakMap<object, PreparedWords>();

function wordsOf(resource: MatchableResource): PreparedWords {
  let words = prepared.get(resource);
  if (!words) {
    words = {
      tags: new Set(resource.tags.flatMap(keywords)),
      title: new Set(keywords(resource.title)),
      description: new Set(keywords(resource.description ?? "")),
      content: new Set(keywords((resource.content ?? "").slice(0, CONTENT_LIMIT))),
    };
    prepared.set(resource, words);
  }
  return words;
}

/** Étiquette des cours entiers, découpés par ailleurs en briques « Cours — Section ». */
export const WHOLE_COURSE_TAG = "cours complet";

export function isWholeCourse(resource: Pick<MatchableResource, "tags">): boolean {
  return resource.tags.some((t) => t.trim().toLowerCase() === WHOLE_COURSE_TAG);
}

export function matchResources<R extends MatchableResource>(
  expectationLabel: string,
  resources: R[],
  limit = 5,
  /** `excerpts: false` : la couverture n'a pas besoin des extraits (le plus coûteux du calcul). */
  options: { excerpts?: boolean } = {},
): ResourceMatch<R>[] {
  const withExcerpts = options.excerpts !== false;
  const wanted = keywords(expectationLabel);
  if (wanted.length === 0) return [];

  const matches: ResourceMatch<R>[] = [];
  for (const resource of resources) {
    const { tags, title, description, content } = wordsOf(resource);

    const shared: string[] = [];
    const where: Record<MatchField, string[]> = {
      tag: [],
      title: [],
      description: [],
      content: [],
    };
    let score = 0;
    for (const word of wanted) {
      const field: MatchField | null = tags.has(word)
        ? "tag"
        : title.has(word)
          ? "title"
          : description.has(word)
            ? "description"
            : content.has(word)
              ? "content"
              : null;
      if (field) {
        shared.push(word);
        where[field].push(word);
        score += WEIGHTS[field];
      }
    }
    if (score >= MIN_SCORE) {
      const percent = matchPercent(score, wanted.length);
      matches.push({
        resource,
        shared,
        score,
        excerpt: withExcerpts ? excerptForTerms(resource, shared) : null,
        where,
        level: matchLevel(percent),
        percent,
        reason: matchReason(where),
      });
    }
  }
  return matches
    .sort(
      (a, b) =>
        b.score - a.score ||
        // À score égal, les briques passent avant le cours complet dont elles sont issues.
        Number(isWholeCourse(a.resource)) - Number(isWholeCourse(b.resource)) ||
        a.resource.title.localeCompare(b.resource.title, "fr"),
    )
    .slice(0, limit);
}

export type CoverageState = "covered" | "to_build" | "uncovered";

export interface CoverageInput {
  /** Séances qui couvrent l'attendu (course_expectation). */
  courseIds: string[];
  /** Ressources retenues du module qui correspondent à l'attendu, avec leur statut. */
  retainedMatches: { status: "ready" | "progress" }[];
}

/**
 * Couvert : une séance le traite ou une ressource prête retenue y répond. À construire : une
 * ressource « à construire » est déjà retenue pour lui. Sinon non couvert.
 */
export function coverageState({ courseIds, retainedMatches }: CoverageInput): CoverageState {
  if (courseIds.length > 0 || retainedMatches.some((m) => m.status === "ready")) return "covered";
  if (retainedMatches.length > 0) return "to_build";
  return "uncovered";
}

/**
 * Couverture par liens EXPLICITES : un attendu est couvert s'il a une séance, ou une ressource prête
 * liée ; « à construire » si seules des ressources à construire lui sont liées. La correspondance par
 * mots ne compte jamais : elle ne fait que proposer.
 */
export function coverageFromLinks(input: {
  courseIds: string[];
  linkedResources: { status: "ready" | "progress" }[];
}): CoverageState {
  return coverageState({ courseIds: input.courseIds, retainedMatches: input.linkedResources });
}

export interface AutoLinkProposal {
  expectationId: string;
  label: string;
  resourceId: string;
  title: string;
  percent: number;
}

/**
 * « Reprendre le rapprochement automatique » : pour chaque attendu sans lien, la ressource déjà
 * retenue pour le module qui correspond le mieux (une seule). Ne crée rien : sert à l'aperçu.
 */
export function proposeAutoLinks<R extends MatchableResource>(
  expectations: { id: string; label: string }[],
  retained: R[],
  linked: ReadonlyMap<string, ReadonlySet<string>>,
): AutoLinkProposal[] {
  return expectations.flatMap((e) => {
    if ((linked.get(e.id)?.size ?? 0) > 0) return [];
    const [best] = matchResources(e.label, retained, 1, { excerpts: false });
    return best
      ? [
          {
            expectationId: e.id,
            label: e.label,
            resourceId: best.resource.id,
            title: best.resource.title,
            percent: best.percent,
          },
        ]
      : [];
  });
}

export interface CoverageSummary {
  covered: number;
  toBuild: number;
  uncovered: number;
  total: number;
}

export function summarizeCoverage(states: CoverageState[]): CoverageSummary {
  const count = (s: CoverageState) => states.filter((x) => x === s).length;
  return {
    covered: count("covered"),
    toBuild: count("to_build"),
    uncovered: count("uncovered"),
    total: states.length,
  };
}

/** « 4 couverts, 2 à construire » ; « 1 sans ressource » si des attendus n'ont encore rien. */
export function formatCoverage(s: CoverageSummary): string {
  if (s.total === 0) return "Aucun attendu à rapprocher.";
  const parts = [`${s.covered} couvert${s.covered > 1 ? "s" : ""}`];
  if (s.toBuild) parts.push(`${s.toBuild} à construire`);
  if (s.uncovered) parts.push(`${s.uncovered} sans ressource`);
  return parts.join(", ");
}
