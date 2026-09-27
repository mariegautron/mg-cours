// Lecture d'un export Notion « Markdown & CSV » (sous-pages incluses) : chaque page est un
// fichier `<Titre> <id 32 hex>.md`. On indexe tous les fichiers par id de page.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface NotionPage {
  id: string;
  path: string;
  title: string;
  properties: Record<string, string>;
  /** Markdown ; les images locales y restent citées par leur chemin relatif (`![alt](Dossier/img.png)`). */
  body: string;
  /** Images locales citées dans `body` : chemin tel qu'écrit et fichier sur disque. */
  images: NotionImage[];
}

export interface NotionImage {
  src: string;
  file: string;
}

const LOCAL_IMAGE = /!\[[^\]]*\]\((?!https?:)([^)]*)\)/g;

/** Retire les images locales (pour un contenu sans stockage de fichiers, ex. sujet d'évaluation). */
export function stripLocalImages(body: string): { body: string; dropped: number } {
  let dropped = 0;
  const out = body
    .replace(new RegExp(LOCAL_IMAGE.source + "\\n?", "g"), () => {
      dropped++;
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { body: out, dropped };
}

const PAGE_FILE = /([0-9a-f]{32})\.md$/;
/** Base Notion exportée en CSV (toutes les propriétés) : indexée sous `csv:<id de la base>`. */
const DATABASE_FILE = /([0-9a-f]{32})_all\.csv$/;

export function indexExport(roots: string[]): Map<string, string> {
  const index = new Map<string, string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else {
        const m = PAGE_FILE.exec(name);
        if (m) index.set(m[1], path);
        const db = DATABASE_FILE.exec(name);
        if (db) index.set(`csv:${db[1]}`, path);
      }
    }
  };
  roots.forEach(walk);
  return index;
}

/** Retire les séparateurs d'id des URL Notion : `2df903c7-4f13-…` → 32 hex. */
export function normalizeId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

export function readPage(index: Map<string, string>, rawId: string): NotionPage {
  const id = normalizeId(rawId);
  const path = index.get(id);
  if (!path) throw new Error(`Page Notion ${id} absente de l'export`);
  const lines = readFileSync(path, "utf8").replace(/\r\n/g, "\n").split("\n");

  const titleLine = lines.findIndex((l) => l.startsWith("# "));
  const title = cleanInline(lines[titleLine]?.slice(2) ?? "");
  let i = titleLine + 1;
  while (i < lines.length && lines[i].trim() === "") i++;

  // Bloc de propriétés de base Notion : lignes « Clé: valeur » juste sous le titre.
  const properties: Record<string, string> = {};
  const prop = /^([^#>*\-\s|`][^:]{0,60}): (.*)$/;
  let j = i;
  while (j < lines.length && prop.test(lines[j])) {
    const [, k, v] = prop.exec(lines[j])!;
    properties[k.trim()] = v.trim();
    j++;
  }
  if (j > i && (j === lines.length || lines[j].trim() === "")) i = j;
  else for (const k of Object.keys(properties)) delete properties[k];

  const body = lines
    .slice(i)
    .join("\n")
    // Liens internes vers d'autres pages de l'export : on garde le texte.
    .replace(/\[([^\]]+)\]\((?!https?:)[^)]*\.md\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const images = [...body.matchAll(LOCAL_IMAGE)].map(([, src]) => {
    let rel = src;
    try {
      rel = decodeURIComponent(src);
    } catch {
      // chemin mal encodé : gardé tel quel
    }
    return { src, file: resolve(dirname(path), rel) };
  });

  return { id, path, title, properties, body, images };
}

/** Retire le gras Markdown et les espaces superflus d'un texte d'une ligne. */
export function cleanInline(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

/** Chemin du CSV complet d'une base Notion (`<Nom> <id>_all.csv`). */
export function databaseCsv(index: Map<string, string>, databaseId: string): string {
  const path = index.get(`csv:${normalizeId(databaseId)}`);
  if (!path) throw new Error(`Base Notion ${databaseId} absente de l'export (CSV)`);
  return path;
}

/** Ids de pages cités dans une valeur de propriété relation (liens `… <id>.md` ou URL Notion). */
export function linkedIds(value: string | undefined): string[] {
  return [...(value ?? "").matchAll(/([0-9a-f]{32})(?=\.md|\.csv|[),\s]|$)/g)].map((m) => m[1]);
}
