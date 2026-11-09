/**
 * E19 / US-117 : recherche globale (Ctrl K). Fonctions pures : normalisation (casse, accents),
 * classement (préfixe avant sous-chaîne, puis ordre alphabétique), groupement et limite.
 */
export type SearchKind =
  | "goto"
  | "module"
  | "course"
  | "student"
  | "resource"
  | "question"
  | "assessment"
  | "grid"
  | "appreciation"
  | "makeup";

export interface SearchCandidate {
  kind: SearchKind;
  id: string;
  /** Libellé affiché. */
  label: string;
  /** Précision affichée sous le libellé (code, école…). */
  detail?: string;
  /** Textes dans lesquels chercher (le libellé est toujours inclus). */
  terms?: string[];
  /** Adresse propre (séance : /modules/{module}/courses/{id}) ; sinon `base/id`. */
  href?: string;
  /** Tolère une faute de frappe (mots de 5 lettres ou plus) : noms d'étudiant·es. */
  fuzzy?: boolean;
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
  /** Nombre total de correspondances (les résultats peuvent en montrer moins). */
  total: number;
  /** Page qui montre toutes les correspondances (Bibliothèque, Étudiant·es). */
  moreHref?: string;
}

export const MIN_QUERY_LENGTH = 2;
export const GROUP_LIMIT = 5;
/** Résultats envoyés par catégorie : « Voir les N autres » déplie la catégorie dans la fenêtre. */
export const GROUP_MAX = 30;

export const GROUP_ORDER: { kind: SearchKind; title: string; base: string }[] = [
  { kind: "goto", title: "Aller à", base: "" },
  { kind: "module", title: "Modules", base: "/modules" },
  { kind: "course", title: "Séances", base: "/modules" },
  { kind: "assessment", title: "Évaluations", base: "/modules" },
  { kind: "grid", title: "Grilles", base: "/assessments/grids" },
  { kind: "appreciation", title: "Appréciations", base: "/modules" },
  { kind: "makeup", title: "Rattrapages", base: "/modules" },
  { kind: "student", title: "Étudiant·es", base: "/students" },
  { kind: "resource", title: "Bibliothèque", base: "/resources" },
  { kind: "question", title: "Questions", base: "/questions" },
];

/** Écrans de l'appli, trouvables par plusieurs mots-clés (sans accents ni casse). */
const SCREENS: { id: string; label: string; href: string; terms: string[] }[] = [
  {
    id: "billing",
    label: "Facturation",
    href: "/billing",
    terms: ["facture", "factures", "facturer", "payer", "paiement", "factur-x"],
  },
  {
    id: "settings",
    label: "Réglages",
    href: "/settings",
    terms: ["parametres", "profil", "ecole", "ecoles", "theme", "taille du texte", "iban"],
  },
  {
    id: "export",
    label: "Exporter mes données",
    href: "/settings#my-data",
    terms: ["export", "exporter", "sauvegarde", "donnees", "telecharger", "mes donnees"],
  },
  {
    id: "password",
    label: "Changer mon mot de passe",
    href: "/settings#account",
    terms: ["mot de passe", "password", "compte"],
  },
  {
    id: "logout",
    label: "Se déconnecter",
    href: "/settings#account",
    terms: ["deconnexion", "deconnecter", "compte", "quitter"],
  },
  {
    id: "new-module",
    label: "Nouveau module",
    href: "/modules/new",
    terms: ["creer module", "creer un module", "nouveau module", "ajouter un module"],
  },
  {
    id: "archived",
    label: "Modules archivés",
    href: "/modules?filter=archived",
    terms: ["archives", "archive", "ranges", "anciens modules", "annee derniere"],
  },
  { id: "assessments", label: "Évaluations", href: "/assessments", terms: ["grilles", "notes"] },
  { id: "students", label: "Étudiant·es", href: "/students", terms: ["etudiants", "eleves"] },
  {
    id: "library",
    label: "Bibliothèque",
    href: "/resources",
    terms: ["ressources", "cours", "fiches", "diapos"],
  },
  {
    id: "import-students",
    label: "Importer une liste d’étudiant·es",
    href: "/students/import",
    terms: ["importer", "import", "hyperplanning", "csv", "liste", "promo"],
  },
  {
    id: "import-photos",
    label: "Importer le trombinoscope",
    href: "/students/photos",
    terms: ["trombinoscope", "photos", "trombi"],
  },
];

/** Écrans du module ouvert. */
const MODULE_SCREENS: { id: string; label: string; path: string; terms: string[] }[] = [
  { id: "rattrapages", label: "Rattrapages", path: "rattrapages", terms: ["absence excusee"] },
  { id: "jalons", label: "Jalons", path: "jalons", terms: ["jalon", "projet"] },
  { id: "couverture", label: "Couverture", path: "couverture", terms: ["attendus couverts"] },
  { id: "attendus", label: "Attendus", path: "expectations", terms: ["fiche ecole", "objectifs"] },
  {
    id: "progression",
    label: "Progression pédagogique",
    path: "outline",
    terms: ["progression", "trame"],
  },
  { id: "finish", label: "Terminer le module", path: "finish", terms: ["terminer", "cloturer"] },
  {
    id: "invoice",
    label: "Facture du module",
    path: "billing",
    terms: ["facture", "facturer", "payer"],
  },
  { id: "feedback", label: "Avis des étudiant·es", path: "feedback", terms: ["avis", "retour"] },
];

/** Candidats « Aller à » : écrans de l'appli, et ceux du module ouvert s'il y en a un. */
export function screenCandidates(module?: { id: string; name: string }): SearchCandidate[] {
  return [
    ...SCREENS.map((x) => ({ kind: "goto" as const, ...x })),
    ...(module
      ? MODULE_SCREENS.map((x) => ({
          kind: "goto" as const,
          id: `${module.id}-${x.id}`,
          label: `${x.label} · ${module.name}`,
          href: `/modules/${module.id}/${x.path}`,
          terms: [x.label, ...x.terms],
        }))
      : []),
  ];
}

/**
 * Minuscules, sans accents ni ligatures, tirets et apostrophes changés en espaces, espaces réduits :
 * « Éloïse  » → « eloise », « Jean-Baptiste » → « jean baptiste », « d’un » → « d un ».
 */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[-‐‑–—'’ʼ_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Vrai si `a` et `b` diffèrent d'au plus une lettre (ajout, retrait ou remplacement). */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Chaque mot de la requête commence un mot du texte, ou s'en écarte d'une lettre (5 lettres et +). */
function fuzzyMatch(q: string, text: string): boolean {
  const words = text.split(" ");
  return q
    .split(" ")
    .every((w) => words.some((t) => t.startsWith(w) || (w.length >= 5 && withinOneEdit(w, t))));
}

/**
 * 0 : un texte commence par la requête ; 1 : un texte la contient ; 2 : à une faute près (si
 * `fuzzy`) ; `null` : aucune correspondance.
 */
export function matchRank(query: string, texts: string[], fuzzy = false): 0 | 1 | 2 | null {
  const q = normalize(query);
  if (!q) return null;
  let best: 0 | 1 | 2 | null = null;
  for (const t of texts) {
    const n = normalize(t);
    if (n.startsWith(q)) return 0;
    if (n.includes(q)) best = 1;
    else if (fuzzy && best === null && fuzzyMatch(q, n)) best = 2;
  }
  return best;
}

/** Résultats groupés par type, classés et limités ; vide sous 2 caractères. */
export function groupResults(
  candidates: SearchCandidate[],
  query: string,
  limit = GROUP_MAX,
): SearchGroup[] {
  if (normalize(query).length < MIN_QUERY_LENGTH) return [];
  const groups: SearchGroup[] = [];
  const q = encodeURIComponent(query.trim());
  for (const { kind, title, base } of GROUP_ORDER) {
    const ranked = candidates
      .filter((c) => c.kind === kind)
      .map((c) => ({ c, rank: matchRank(query, [c.label, ...(c.terms ?? [])], c.fuzzy) }))
      .filter((x): x is { c: SearchCandidate; rank: 0 | 1 | 2 } => x.rank !== null)
      .sort(
        (a, b) => a.rank - b.rank || normalize(a.c.label).localeCompare(normalize(b.c.label), "fr"),
      );
    if (ranked.length) {
      groups.push({
        kind,
        title,
        total: ranked.length,
        moreHref:
          kind === "student"
            ? `/students?q=${q}`
            : kind === "resource"
              ? `/resources?q=${q}`
              : undefined,
        results: ranked.slice(0, limit).map(({ c }) => ({
          kind: c.kind,
          id: c.id,
          label: c.label,
          detail: c.detail,
          href: c.href ?? `${base}/${c.id}`,
        })),
      });
    }
  }
  return groups;
}
