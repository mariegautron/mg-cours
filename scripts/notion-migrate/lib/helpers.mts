// Briques communes aux plans de cours : images de ressources, documents de module, liaisons.
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";

import { MIME_BY_EXT, safeName } from "../../../src/lib/storage/files.ts";

import type { Importer } from "./importer.mts";
import type { NotionPage } from "./notion.mts";

/** Images locales d'une page → bucket `resource-files` + `resource.files` (citées par leur nom). */
export async function importResourceImages(
  imp: Importer,
  resourceId: string,
  p: NotionPage,
  issues: string[],
) {
  if (!p.images.length) return;
  const { data } = imp.isDry(resourceId)
    ? { data: null }
    : await imp.sb.from("resource").select("files").eq("id", resourceId).single();
  const existing = (Array.isArray(data?.files) ? data.files : []) as { name: string }[];
  const files: Record<string, unknown>[] = [...existing];
  for (const img of p.images) {
    const name = basename(img.file);
    const mime = MIME_BY_EXT[extname(name).slice(1).toLowerCase()];
    if (!mime?.startsWith("image/")) {
      issues.push(`${p.title} › ${name} : format non accepté`);
      continue;
    }
    if (!existsSync(img.file)) {
      issues.push(`${p.title} › ${name} : fichier absent de l'export`);
      continue;
    }
    if (files.some((f) => f.name === name)) continue;
    const body = readFileSync(img.file);
    const path = `${imp.ownerId}/${resourceId}/${randomUUID()}-${safeName(name)}`;
    imp.report.push({
      table: "resource-files (images)",
      action: "envoyer",
      label: `${p.title} › ${name} (${Math.max(1, Math.round(body.length / 1024))} Ko)`,
    });
    await imp.upload("resource-files", path, body, mime);
    files.push({ path, name, size: body.length, mime });
  }
  if (files.length !== existing.length)
    await imp.update("resource", resourceId, { files }, p.title);
}

/** PDF déposé sur le module (trame envoyée, facture émise hors application). */
export async function importModuleDocument(
  imp: Importer,
  moduleId: string,
  kind: "outline_sent" | "external_invoice",
  file: string | null,
  sourceId: string,
  name: string,
) {
  if (!file) {
    imp.warnings.push(`Pas de PDF fourni pour « ${name} ».`);
    return;
  }
  const size = statSync(file).size;
  const path = `${imp.ownerId}/${moduleId}/${safeName(basename(file))}`;
  if (!(await imp.findRef("notion", sourceId, "module_document")))
    await imp.upload("module-documents", path, readFileSync(file), "application/pdf");
  await imp.ensure(
    "module_document",
    "notion",
    sourceId,
    { module_id: moduleId, kind, name, path, size_bytes: size, mime: "application/pdf" },
    `${name} (${Math.round(size / 1024)} Ko)`,
  );
}

/** « DECHO Kotchi Mireille Annick » → nom en capitales en tête, prénoms ensuite. */
export function splitNotionName(full: string): { first: string; last: string } {
  const tokens = full.trim().split(/\s+/);
  const isUpper = (t: string) => t === t.toLocaleUpperCase("fr") && /\p{L}/u.test(t);
  let i = 0;
  while (i < tokens.length - 1 && isUpper(tokens[i])) i++;
  if (i === 0) return { first: tokens.slice(1).join(" "), last: tokens[0] ?? "" };
  return { first: tokens.slice(i).join(" "), last: tokens.slice(0, i).join(" ") };
}
