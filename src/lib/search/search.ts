/**
 * E19 / US-117 : recherche globale (Ctrl K). Fonctions pures : normalisation (casse, accents),
 * classement (préfixe avant sous-chaîne, puis ordre alphabétique), groupement et limite.
 */
export type SearchKind = "module" | "student" | "resource" | "question";

export interface SearchCandidate {
  kind: SearchKind;
  id: string;
  /** Libellé affiché. */
  label: string;
  /** Précision affichée sous le libellé (code, école…). */
  detail?: string;
  /** Textes dans lesquels chercher (le libellé est toujours inclus). */
  terms?: string[];
}

export interface SearchResult {
  kind: SearchKind;
  id: string;
  label: string;
  detail?: string;
  href: string;
}

export interface SearchGroup {
  kind: SearchKind;
  title: string;
  results: SearchResult[];
}

export const MIN_QUERY_LENGTH = 2;
export const GROUP_LIMIT = 5;

export const GROUP_ORDER: { kind: SearchKind; title: string; base: string }[] = [
  { kind: "module", title: "Modules", base: "/modules" },
  { kind: "student", title: "Étudiant·es", base: "/students" },
  { kind: "resource", title: "Bibliothèque", base: "/resources" },
  { kind: "question", title: "Questions", base: "/questions" },
];

/** Minuscules, sans accents ni ligatures, espaces réduits : « Éloïse  » → « eloise ». */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** 0 : un texte commence par la requête ; 1 : un texte la contient ; `null` : aucune correspondance. */
export function matchRank(query: string, texts: string[]): 0 | 1 | null {
  const q = normalize(query);
  if (!q) return null;
  let best: 0 | 1 | null = null;
  for (const t of texts) {
    const n = normalize(t);
    if (n.startsWith(q)) return 0;
    if (n.includes(q)) best = 1;
  }
  return best;
}

/** Résultats groupés par type, classés et limités ; vide sous 2 caractères. */
export function groupResults(
  candidates: SearchCandidate[],
  query: string,
  limit = GROUP_LIMIT,
): SearchGroup[] {
  if (normalize(query).length < MIN_QUERY_LENGTH) return [];
  const groups: SearchGroup[] = [];
  for (const { kind, title, base } of GROUP_ORDER) {
    const ranked = candidates
      .filter((c) => c.kind === kind)
      .map((c) => ({ c, rank: matchRank(query, [c.label, ...(c.terms ?? [])]) }))
      .filter((x): x is { c: SearchCandidate; rank: 0 | 1 } => x.rank !== null)
      .sort(
        (a, b) => a.rank - b.rank || normalize(a.c.label).localeCompare(normalize(b.c.label), "fr"),
      )
      .slice(0, limit);
    if (ranked.length) {
      groups.push({
        kind,
        title,
        results: ranked.map(({ c }) => ({
          kind,
          id: c.id,
          label: c.label,
          detail: c.detail,
          href: `${base}/${c.id}`,
        })),
      });
    }
  }
  return groups;
}
