import { extractText } from "unpdf";

import { parseExpectationsFromFiche, type ExpectationDraft } from "@/lib/modules/expectations";
import {
  moduleFichePath,
  type FicheImportStatus,
  type PendingFiche,
} from "@/lib/modules/fiche-import";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Attendus reconnus dans une fiche PDF (objectifs / unités) ; liste vide si le PDF est illisible ou
 * ne contient rien de reconnu. Pas de repli « une ligne = un attendu » : sans relecture, il
 * enregistrerait l'en-tête de la fiche comme attendu.
 */
export async function draftsFromPdf(bytes: Uint8Array): Promise<ExpectationDraft[]> {
  try {
    const { text } = await extractText(bytes, { mergePages: true });
    return parseExpectationsFromFiche(text);
  } catch {
    return [];
  }
}

/**
 * Enregistre la fiche déposée avant la création du module : déplace le PDF dans le dossier du module,
 * l'enregistre comme document « Attendus de l'école » puis en lit les attendus. Ne lève jamais :
 * le module existe déjà, le résultat dit ce qui est resté à faire.
 */
export async function importFicheForModule(
  supabase: Supabase,
  userId: string,
  moduleId: string,
  fiche: PendingFiche,
): Promise<FicheImportStatus> {
  const path = moduleFichePath(userId, moduleId, fiche.path);
  const bucket = supabase.storage.from("module-documents");

  const { error: moveError } = await bucket.move(fiche.path, path);
  if (moveError) {
    await bucket.remove([fiche.path]);
    return "failed";
  }

  const { error: docError } = await supabase.from("module_document").insert({
    module_id: moduleId,
    kind: "school_expectations",
    name: fiche.name.slice(0, 255),
    path,
    size_bytes: fiche.size,
    mime: fiche.mime,
  });
  if (docError) {
    await bucket.remove([path]);
    return "failed";
  }

  const { data: file } = await bucket.download(path);
  if (!file) return "review";
  const drafts = await draftsFromPdf(new Uint8Array(await file.arrayBuffer()));
  if (!drafts.length) return "review";

  const { error } = await supabase.from("module_expectation").insert(
    drafts.map((d, position) => ({
      module_id: moduleId,
      kind: d.kind,
      label: d.label,
      hours: d.kind === "unit" ? d.hours : null,
      modality: d.kind === "unit" ? d.modality : null,
      position,
    })),
  );
  return error ? "review" : "read";
}
