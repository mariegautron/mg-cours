/**
 * US-56 : recherche dans les ressources — titre, description, tags et contenu Markdown, sans
 * tenir compte de la casse ni des accents. Tous les mots cherchés doivent apparaître (dans
 * n'importe quel champ). Fonctions pures.
 */

export interface SearchableResource {
  title: string;
  description?: string | null;
  tags?: string[] | null;
  /** Markdown. */
  content?: string | null;
}

export type SearchField = "title" | "description" | "tags" | "content";

export const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
  title: "Titre",
  description: "Description",
  tags: "Tag",
  content: "Contenu",
};

export interface SearchExcerpt {
  field: SearchField;
  before: string;
  match: string;
  after: string;
}

export interface SearchResult {
  matched: boolean;
  /** Extrait hors titre où figure un mot cherché (le titre se lit déjà dans la liste). */
  excerpt: SearchExcerpt | null;
}

/** Caractères de contexte de part et d'autre du mot trouvé. */
const CONTEXT = 50;

/** Minuscules sans accents, espaces réduits : « Éthique  Web » → « ethique web ». */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Mots cherchés, normalisés et distincts. */
export function searchTerms(query: string): string[] {
  return [...new Set(normalizeSearch(query).split(" ").filter(Boolean))];
}

/** Texte normalisé + position de chaque caractère normalisé dans le texte d'origine. */
function normalizeWithMap(text: string): { normalized: string; origin: number[] } {
  let normalized = "";
  const origin: number[] = [];
  let index = 0;
  for (const char of text) {
    const folded = char.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    for (const c of folded) {
      normalized += c;
      origin.push(index);
    }
    index += char.length;
  }
  return { normalized, origin };
}

/** Retire la syntaxe Markdown courante pour ne garder que le texte lisible d'un extrait. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[a-z]*\n?/gi, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|[-*+>]|\d+\.)\s+/gm, "")
    .replace(/[*_`~|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExcerpt(field: SearchField, text: string, terms: string[]): SearchExcerpt | null {
  const { normalized, origin } = normalizeWithMap(text);
  let at = -1;
  let length = 0;
  for (const term of terms) {
    const i = normalized.indexOf(term);
    if (i !== -1 && (at === -1 || i < at)) {
      at = i;
      length = term.length;
    }
  }
  if (at === -1) return null;

  const start = origin[at];
  const end = origin[at + length - 1] + 1;
  const from = Math.max(0, start - CONTEXT);
  const to = Math.min(text.length, end + CONTEXT);
  const clean = (s: string) => s.replace(/\s+/g, " ");
  return {
    field,
    before: `${from > 0 ? "…" : ""}${clean(text.slice(from, start))}`,
    match: clean(text.slice(start, end)),
    after: `${clean(text.slice(end, to))}${to < text.length ? "…" : ""}`,
  };
}

function searchFields(resource: SearchableResource): [SearchField, string][] {
  return [
    ["title", resource.title],
    ["tags", (resource.tags ?? []).join(" · ")],
    ["description", resource.description ?? ""],
    ["content", stripMarkdown(resource.content ?? "")],
  ];
}

function firstExcerpt(fields: [SearchField, string][], terms: string[]): SearchExcerpt | null {
  for (const [field, text] of fields) {
    if (field === "title" || !text) continue;
    const excerpt = buildExcerpt(field, text, terms);
    if (excerpt) return excerpt;
  }
  return null;
}

/** Extrait (hors titre) montrant l'un des mots donnés, déjà normalisés ; utilisé par le rapprochement. */
export function excerptForTerms(
  resource: SearchableResource,
  terms: string[],
): SearchExcerpt | null {
  return firstExcerpt(searchFields(resource), terms);
}

export function searchResource(resource: SearchableResource, query: string): SearchResult {
  const terms = searchTerms(query);
  if (terms.length === 0) return { matched: true, excerpt: null };

  const fields = searchFields(resource);
  const haystack = normalizeSearch(fields.map(([, text]) => text).join(" \n "));
  if (!terms.every((t) => haystack.includes(t))) return { matched: false, excerpt: null };

  return { matched: true, excerpt: firstExcerpt(fields, terms) };
}

/** Garde les ressources qui correspondent, avec leur extrait ; sans recherche, tout est gardé. */
export function searchResources<T extends SearchableResource>(
  resources: T[],
  query: string,
): { resource: T; excerpt: SearchExcerpt | null }[] {
  return resources.flatMap((resource) => {
    const { matched, excerpt } = searchResource(resource, query);
    return matched ? [{ resource, excerpt }] : [];
  });
}
