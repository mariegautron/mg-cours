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
}

/** Poids d'un mot-clé retrouvé : tag > titre > description > contenu. */
const WEIGHTS = { tag: 4, title: 3, description: 2, content: 1 } as const;

/** Score minimal pour proposer une ressource : un mot du titre ou des tags, ou deux mots du contenu. */
const MIN_SCORE = 2;

/** Nombre de caractères de contenu lus par ressource. */
const CONTENT_LIMIT = 4000;

export function matchResources<R extends MatchableResource>(
  expectationLabel: string,
  resources: R[],
  limit = 5,
): ResourceMatch<R>[] {
  const wanted = keywords(expectationLabel);
  if (wanted.length === 0) return [];

  const matches: ResourceMatch<R>[] = [];
  for (const resource of resources) {
    const tags = new Set(resource.tags.flatMap(keywords));
    const title = new Set(keywords(resource.title));
    const description = new Set(keywords(resource.description ?? ""));
    const content = new Set(keywords((resource.content ?? "").slice(0, CONTENT_LIMIT)));

    const shared: string[] = [];
    let score = 0;
    for (const word of wanted) {
      const weight = tags.has(word)
        ? WEIGHTS.tag
        : title.has(word)
          ? WEIGHTS.title
          : description.has(word)
            ? WEIGHTS.description
            : content.has(word)
              ? WEIGHTS.content
              : 0;
      if (weight) {
        shared.push(word);
        score += weight;
      }
    }
    if (score >= MIN_SCORE) matches.push({ resource, shared, score });
  }
  return matches
    .sort((a, b) => b.score - a.score || a.resource.title.localeCompare(b.resource.title, "fr"))
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
