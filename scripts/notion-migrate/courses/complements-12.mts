// Compléments 12 : découpe déterministe des ressources « Cours » en briques modulaires (par titres
// `##`, ou `#` à défaut), pour les réutiliser dans d'autres modules. Le cours d'origine reste
// entier (tag « cours complet ») ; aucun lien de séance ni de module n'est ajouté aux fragments.
// Simulation par défaut ; rejouable (clé stable : parent + titre de section).
import { randomUUID } from "node:crypto";

import { safeName } from "../../../src/lib/storage/files.ts";
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { complete, select } from "./complements-fonctions.mts";
import { keywordTags, mergeTags } from "./complements-9.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

/** Une section plus courte est rattachée à la précédente. */
export const MIN_SECTION_CHARS = 400;
const FULL_TAG = "cours complet";
const SOURCE_PREFIX = "source : ";

const EXTRA: [string, RegExp][] = [
  ["planning poker", /planning poker/],
  ["daily", /\bdaily\b/],
  ["product owner", /product owner/],
  ["scrum master", /scrum master/],
  ["definition of done", /definition of done|\bdod\b/],
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const cleanTitle = (s: string) =>
  s
    .replace(/\*\*|__/g, "")
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, "")
    .replace(/^[^\p{L}\d]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
const slug = (s: string) =>
  fold(cleanTitle(s))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

export interface Fragment {
  title: string;
  body: string;
}

/** Découpe sur `##` (sinon `#`), hors blocs de code ; sections courtes rattachées à la précédente. */
export function splitCourse(md: string): { fragments: Fragment[]; merged: number } {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const level = lines.some((l) => /^##\s/.test(l)) ? "##" : "#";
  const re = new RegExp(`^${level}\\s+(.+)$`);
  const sections: { title: string; lines: string[] }[] = [];
  let fence = false;
  let intro: string[] = [];
  for (const l of lines) {
    if (/^```/.test(l)) fence = !fence;
    const m = !fence ? re.exec(l) : null;
    if (m) sections.push({ title: cleanTitle(m[1]), lines: [l] });
    else if (sections.length) sections.at(-1)!.lines.push(l);
    else intro.push(l);
  }
  if (!sections.length) return { fragments: [], merged: 0 };
  // Le texte avant le premier titre ouvre la première section.
  if (intro.join("").trim()) sections[0].lines = [...intro, ...sections[0].lines];
  intro = [];
  const out: { title: string; body: string }[] = [];
  let merged = 0;
  for (const s of sections) {
    const body = s.lines.join("\n").trim();
    if (body.length < MIN_SECTION_CHARS && out.length) {
      out.at(-1)!.body += `\n\n${body}`;
      merged++;
    } else out.push({ title: s.title, body });
  }
  // Première section courte : rattachée à la suivante.
  while (out.length > 1 && out[0].body.length < MIN_SECTION_CHARS) {
    out[1].body = `${out[0].body}\n\n${out[1].body}`;
    out[1].title = out[1].title;
    out.shift();
    merged++;
  }
  return { fragments: out.length >= 2 ? out : [], merged };
}

export function sectionTags(title: string): string[] {
  const t = fold(title);
  return [...keywordTags(title), ...EXTRA.filter(([, r]) => r.test(t)).map(([tag]) => tag)];
}

export async function migrate({ imp }: CourseContext): Promise<void> {
  const courses = (
    await select(imp, "resource", "id, title, category, audience, tags, content, files", {
      kind: "course",
    })
  ).filter((r) => !((r.tags as string[] | null) ?? []).some((t) => t.startsWith(SOURCE_PREFIX)));
  const priority = (r: Record<string, unknown>) =>
    /^(Gestion de projet|Agilité)$/.test(String(r.category ?? "")) ? 0 : 1;
  courses.sort(
    (a, b) => priority(a) - priority(b) || String(a.title).localeCompare(String(b.title), "fr"),
  );

  let total = 0;
  let merged = 0;
  let split = 0;
  for (const parent of courses) {
    const { fragments, merged: m } = splitCourse(String(parent.content ?? ""));
    merged += m;
    if (!fragments.length) continue;
    split++;
    const parentTitle = String(parent.title);
    const parentTags = (parent.tags as string[] | null) ?? [];
    const files =
      (parent.files as { path: string; name: string; size?: number; mime?: string }[] | null) ?? [];
    for (const f of fragments) {
      total++;
      const tags = mergeTags(
        [
          ...parentTags.filter((t) => t !== FULL_TAG),
          ...sectionTags(f.title),
          `${SOURCE_PREFIX}${parentTitle}`,
        ],
        [],
      );
      // mergeTags borne à 10 : la source doit toujours rester.
      const finalTags = tags.includes(fold(`${SOURCE_PREFIX}${parentTitle}`))
        ? tags
        : [...tags.slice(0, 9), `${SOURCE_PREFIX}${parentTitle}`.toLocaleLowerCase("fr")];
      const id = await imp.ensure(
        "resource",
        "notion",
        `fragment:${String(parent.id)}#${slug(f.title)}`,
        {
          title: `${parentTitle} — ${f.title}`.slice(0, 200),
          kind: "course",
          category: parent.category,
          audience: parent.audience,
          status: "ready",
          tags: finalTags,
          content: f.body,
          files: [],
        },
        `${parentTitle} → « ${f.title} » (${f.body.length} car.)`,
      );
      // Images citées par la brique : copiées dans le stockage (pas de fichier partagé).
      const cited = files.filter((x) => f.body.includes(x.name));
      if (cited.length && imp.apply && !imp.isDry(id)) {
        const copied: unknown[] = [];
        for (const x of cited) {
          const path = `${imp.ownerId}/${id}/${randomUUID()}-${safeName(x.name)}`;
          const { error } = await imp.sb.storage.from("resource-files").copy(x.path, path);
          if (error)
            imp.warnings.push(
              `Image « ${x.name} » non copiée pour « ${f.title} » : ${error.message}`,
            );
          else copied.push({ ...x, path });
        }
        if (copied.length) await imp.update("resource", id, { files: copied }, f.title);
      } else if (cited.length)
        imp.report.push({
          table: "resource-files (copie)",
          action: "envoyer",
          label: `${f.title} › ${cited.map((x) => x.name).join(", ")}`,
        });
    }
    const withFull = mergeTags(parentTags, [FULL_TAG]);
    if (!parentTags.includes(FULL_TAG) && withFull.includes(FULL_TAG))
      await complete(
        imp,
        "resource",
        String(parent.id),
        { tags: withFull },
        `${parentTitle} : tag « ${FULL_TAG} »`,
      );
    else if (!parentTags.includes(FULL_TAG))
      await complete(
        imp,
        "resource",
        String(parent.id),
        { tags: [...parentTags.slice(0, 9), FULL_TAG] },
        `${parentTitle} : tag « ${FULL_TAG} »`,
      );
  }
  imp.warnings.push(
    `${courses.length} cours examiné(s) : ${split} découpé(s) en ${total} brique(s) ; ${merged} section(s) de moins de ${MIN_SECTION_CHARS} caractères rattachée(s) à la précédente. Cours d'origine conservés (tag « ${FULL_TAG} »), aucun lien de séance ni de module ajouté.`,
  );
}
