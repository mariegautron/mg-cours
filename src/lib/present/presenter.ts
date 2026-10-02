import { matchRank, normalize } from "@/lib/search/search";

/**
 * US-134 : logique pure de la vue privée de la présentatrice (déroulé, saut direct, recherche
 * d'une ressource à l'improviste, notes datées). Rien ici ne touche à ce qui est projeté.
 */

/** Index de la première diapositive de chaque section ; -1 si une section n'a aucune diapo. */
export function sectionStarts(slideSections: number[], sectionCount: number): number[] {
  const starts: number[] = Array.from({ length: sectionCount }, () => -1);
  slideSections.forEach((section, i) => {
    if (section >= 0 && section < sectionCount && starts[section] === -1) starts[section] = i;
  });
  return starts;
}

export interface JumpEntry {
  kind: "section" | "slide";
  label: string;
  /** Index de la diapositive où aller. */
  index: number;
}

/** Cibles de « Aller directement à » : les sections du déroulé, puis les diapositives titrées. */
export function jumpEntries(
  sections: string[],
  starts: number[],
  slides: { label: string | null }[],
): JumpEntry[] {
  const entries: JumpEntry[] = [];
  sections.forEach((label, i) => {
    if (starts[i] >= 0) entries.push({ kind: "section", label, index: starts[i] });
  });
  slides.forEach((s, index) => {
    if (s.label) entries.push({ kind: "slide", label: s.label, index });
  });
  return entries;
}

/**
 * Résultats de « Aller directement à » : un numéro (« 7 ») mène à la diapositive 7 ; sinon on
 * cherche dans les titres (sans accent ni casse), préfixe d'abord, sections avant diapositives.
 */
export function findJumps(
  query: string,
  entries: JumpEntry[],
  total: number,
  limit = 6,
): JumpEntry[] {
  const q = normalize(query);
  if (!q) return [];
  if (/^\d+$/.test(q)) {
    const n = Number(q);
    return n >= 1 && n <= total ? [{ kind: "slide", label: `Diapositive ${n}`, index: n - 1 }] : [];
  }
  const seen = new Set<string>();
  return entries
    .map((e, order) => ({ e, order, rank: matchRank(q, [e.label]) }))
    .filter((x): x is { e: JumpEntry; order: number; rank: 0 | 1 } => x.rank !== null)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        (a.e.kind === b.e.kind ? 0 : a.e.kind === "section" ? -1 : 1) ||
        a.order - b.order,
    )
    .map((x) => x.e)
    .filter((e) => {
      const key = `${e.index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export interface LibraryResource {
  id: string;
  title: string;
  kindLabel: string | null;
  audience: string;
  status: string;
}

/** Une ressource se projette si elle est destinée aux étudiant·es ET prête (comme `studentFacing`). */
export const isProjectable = (r: Pick<LibraryResource, "audience" | "status">) =>
  r.audience !== "teacher" && r.status === "ready";

/** Recherche d'une ressource à l'improviste : préfixe avant sous-chaîne, puis ordre alphabétique. */
export function searchLibrary(
  query: string,
  resources: LibraryResource[],
  limit = 6,
): (LibraryResource & { projectable: boolean })[] {
  if (normalize(query).length < 2) return [];
  return resources
    .map((r) => ({ r, rank: matchRank(query, [r.title]) }))
    .filter((x): x is { r: LibraryResource; rank: 0 | 1 } => x.rank !== null)
    .sort(
      (a, b) => a.rank - b.rank || normalize(a.r.title).localeCompare(normalize(b.r.title), "fr"),
    )
    .slice(0, limit)
    .map(({ r }) => ({ ...r, projectable: isProjectable(r) }));
}

/** Ce que la vue privée affiche : l'aperçu privé s'il y en a un, sinon la diapositive projetée. */
export function previewIndex(projected: number, privateIndex: number | null): number {
  return privateIndex ?? projected;
}

export const SESSION_NOTES_MAX = 4000;

/** « [04/11 10:15] texte » à Paris. */
export function datedNoteLine(note: string, now: Date = new Date()): string {
  const day = now.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
  });
  const time = now.toLocaleTimeString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `[${day} ${time}] ${note.trim().replace(/\s+/g, " ")}`;
}

/** Ajoute une note datée à la suite des notes existantes ; `null` si vide ou trop longue. */
export function appendDatedNote(
  existing: string | null,
  note: string,
  now: Date = new Date(),
): string | null {
  if (!note.trim()) return null;
  const line = datedNoteLine(note, now);
  const base = (existing ?? "").trimEnd();
  const next = base ? `${base}\n${line}` : line;
  return next.length <= SESSION_NOTES_MAX ? next : null;
}
