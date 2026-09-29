"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractText } from "unpdf";
import { z } from "zod";

import { draftsFromText, unitsToSkeleton, type ExpectationDraft } from "@/lib/modules/expectations";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND, SESSION_EXPIRED } from "@/lib/messages";

export interface ReadExpectationsResult {
  error?: string;
  drafts?: ExpectationDraft[];
}

export interface SaveExpectationsState {
  error?: string;
  saved?: boolean;
}

/** Lit la fiche PDF déposée (« Attendus de l'école ») du module. */
export async function readExpectationsFromDocument(
  moduleId: string,
): Promise<ReadExpectationsResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };

  const { data: doc } = await supabase
    .from("module_document")
    .select("path, name, mime")
    .eq("module_id", moduleId)
    .eq("kind", "school_expectations")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!doc) return { error: "Aucune fiche déposée sur ce module." };
  if (doc.mime !== "application/pdf" && !/\.pdf$/i.test(doc.name)) {
    return { error: "Seuls les PDF sont lus : colle le texte de la fiche ci-dessous." };
  }

  const { data: file, error } = await supabase.storage.from("module-documents").download(doc.path);
  if (error || !file) return { error: "Le fichier n’a pas pu être ouvert." };

  let text: string;
  try {
    text = (await extractText(new Uint8Array(await file.arrayBuffer()), { mergePages: true })).text;
  } catch {
    return { error: "Ce PDF n’a pas pu être lu. Colle le texte de la fiche ci-dessous." };
  }
  const drafts = draftsFromText(text);
  if (!drafts.length) {
    return {
      error: "Aucun attendu reconnu dans ce PDF. Colle le texte ou saisis-les à la main.",
    };
  }
  return { drafts };
}

/** Lit un texte collé (fiche ou liste : une ligne = un attendu). */
export async function readExpectationsFromText(text: string): Promise<ReadExpectationsResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };
  if (text.length > 100_000) return { error: "Texte trop long." };
  const drafts = draftsFromText(text);
  if (!drafts.length) return { error: "Aucun attendu reconnu dans ce texte." };
  return { drafts };
}

const rowSchema = z.object({
  id: z.string().uuid().nullable(),
  kind: z.enum(["objective", "unit"]),
  label: z.string().trim().min(1).max(1000),
  hours: z.number().min(0).max(500).nullable(),
  modality: z.enum(["FFP", "TDP"]).nullable(),
});

/** Enregistre les attendus : met à jour ceux qui existent, ajoute les nouveaux, supprime les retirés. */
export async function saveExpectations(
  moduleId: string,
  _prev: SaveExpectationsState,
  formData: FormData,
): Promise<SaveExpectationsState> {
  let rows: z.infer<typeof rowSchema>[];
  try {
    const parsed = z
      .array(rowSchema)
      .max(200)
      .safeParse(JSON.parse(String(formData.get("expectationsJson") ?? "[]")));
    if (!parsed.success)
      return { error: "Un attendu est invalide (libellé vide, heures hors limites…)." };
    rows = parsed.data;
  } catch {
    return { error: "Les attendus sont illisibles." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };
  const { data: mod } = await supabase
    .from("module")
    .select("id, owner_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (!mod || mod.owner_id !== auth.user.id) return { error: NOT_FOUND.module };

  const { data: existing } = await supabase
    .from("module_expectation")
    .select("id")
    .eq("module_id", moduleId);
  const existingIds = new Set((existing ?? []).map((e) => e.id));
  const keptIds = new Set(rows.flatMap((r) => (r.id && existingIds.has(r.id) ? [r.id] : [])));

  const removed = [...existingIds].filter((id) => !keptIds.has(id));
  if (removed.length) {
    const { error } = await supabase.from("module_expectation").delete().in("id", removed);
    if (error) return { error: failure("enregistrer", { kept: true }) };
  }

  for (const [position, r] of rows.entries()) {
    const values = {
      kind: r.kind,
      label: r.label,
      hours: r.kind === "unit" ? r.hours : null,
      modality: r.kind === "unit" ? r.modality : null,
      position,
    };
    const { error } =
      r.id && existingIds.has(r.id)
        ? await supabase.from("module_expectation").update(values).eq("id", r.id)
        : await supabase.from("module_expectation").insert({ module_id: moduleId, ...values });
    if (error) return { error: failure("enregistrer", { kept: true }) };
  }

  revalidatePath(`/modules/${moduleId}`);
  revalidatePath(`/modules/${moduleId}/expectations`);
  redirect(`/modules/${moduleId}/expectations?saved=1`);
}

/** « Proposer un squelette de séances depuis les unités » : séances vides à la suite des existantes. */
export async function proposeSkeleton(moduleId: string): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: mod } = await supabase
    .from("module")
    .select("id, owner_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (!mod || mod.owner_id !== auth.user.id) return;

  const { data: units } = await supabase
    .from("module_expectation")
    .select("kind, label")
    .eq("module_id", moduleId)
    .eq("kind", "unit")
    .order("position");
  const skeleton = unitsToSkeleton(units ?? []);
  if (!skeleton.length) return;

  const { count } = await supabase
    .from("course")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);
  const start = count ?? 0;

  const { error } = await supabase.from("course").insert(
    skeleton.map((s, i) => ({
      module_id: moduleId,
      title: s.title,
      position: start + i + 1,
      learning_objectives: [s.objective],
      prep_status: "todo",
    })),
  );
  if (error) return;

  revalidatePath(`/modules/${moduleId}`);
  redirect(`/modules/${moduleId}#courses`);
}
