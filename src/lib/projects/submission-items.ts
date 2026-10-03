/**
 * US-145 : rendus multiples (fichiers ou liens), par personne ou par groupe. Fonctions pures :
 * validation des liens et des fichiers, libellé, regroupement par propriétaire, résumé.
 */
import { ASSESSMENT_FILE_EXTENSIONS, ASSESSMENT_FILE_MAX_BYTES } from "@/lib/assessments/files";

export interface SubmissionItemLike {
  id: string;
  student_id: string | null;
  group_id: string | null;
  kind: string;
  url: string | null;
  label: string;
  file_name: string | null;
  size_bytes: number | null;
  created_at: string;
}

export const LINK_MAX_LENGTH = 2000;
export const LABEL_MAX_LENGTH = 200;

/** Lien http(s) uniquement (jamais javascript: ni data:), normalisé ; sinon l'explication. */
export function validateLink(
  input: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Colle un lien." };
  if (raw.length > LINK_MAX_LENGTH) return { ok: false, error: "Ce lien est trop long." };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "Ce lien n'est pas valide." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Seuls les liens http et https sont acceptés." };
  }
  if (!url.hostname.includes(".")) return { ok: false, error: "Ce lien n'est pas valide." };
  return { ok: true, url: url.toString() };
}

/** Fichier : extension acceptée et taille maximale (mêmes règles que les fichiers d'un sujet). */
export function validateFile(file: {
  name: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  if (file.size <= 0) return { ok: false, error: "Ce fichier est vide." };
  if (file.size > ASSESSMENT_FILE_MAX_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (50 Mo maximum)." };
  }
  if (!ASSESSMENT_FILE_EXTENSIONS.test(file.name)) {
    return {
      ok: false,
      error: "Formats acceptés : PDF, Word, présentation, image, HTML, texte, ZIP.",
    };
  }
  return { ok: true };
}

/** Domaine d'un lien, pour l'afficher sans tout le chemin (« github.com »). */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Nom affiché : l'étiquette si elle existe, sinon le nom du fichier ou le domaine du lien. */
export function itemTitle(
  item: Pick<SubmissionItemLike, "kind" | "label" | "file_name" | "url">,
): string {
  const label = item.label.trim();
  if (label) return label;
  if (item.kind === "file") return item.file_name ?? "Fichier";
  return item.url ? linkHost(item.url) : "Lien";
}

/** Rendus d'une personne ou d'un groupe, du plus ancien au plus récent. */
export function groupByOwner<T extends SubmissionItemLike>(items: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const key = item.student_id ?? item.group_id;
    if (!key) continue;
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

/** « Aucun rendu » / « 1 élément » / « 3 éléments ». */
export function submissionSummary(count: number): string {
  return count === 0 ? "Aucun rendu" : `${count} élément${count > 1 ? "s" : ""}`;
}

export interface SubmissionLine {
  id: string;
  title: string;
  kind: "file" | "link";
  /** Où ouvrir : le lien lui-même, ou la route de téléchargement du fichier. */
  href: string;
  /** « github.com » pour un lien, « fichier » sinon. */
  detail: string;
}

/** Éléments d'un rendu prêts à afficher dans la copie à corriger (bande « Rendu »). */
export function submissionLines(
  items: readonly SubmissionItemLike[],
  assessmentId: string,
): SubmissionLine[] {
  return items.flatMap((i): SubmissionLine[] => {
    if (i.kind === "link" && i.url) {
      return [
        { id: i.id, title: itemTitle(i), kind: "link", href: i.url, detail: linkHost(i.url) },
      ];
    }
    if (i.kind === "file") {
      return [
        {
          id: i.id,
          title: itemTitle(i),
          kind: "file",
          href: `/api/assessments/${assessmentId}/submissions/${i.id}`,
          detail: "fichier",
        },
      ];
    }
    return [];
  });
}
