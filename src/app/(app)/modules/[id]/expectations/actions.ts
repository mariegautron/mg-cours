"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractText } from "unpdf";
import { z } from "zod";

import { cleanCustomLabel, nextExpectationPosition } from "@/lib/modules/custom-expectations";
import {
  draftsFromText,
  planExpectationSplits,
  type ExpectationDraft,
} from "@/lib/modules/expectations";
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
  // Les attendus ajoutés à la main (US-125) ne dépendent pas de la fiche : ni retirés ni réécrits ici.
  const { data: customRows, error: customError } = await supabase
    .from("module_expectation")
    .select("id")
    .eq("module_id", moduleId)
    .eq("origin", "custom");
  const customIds = new Set(customError ? [] : (customRows ?? []).map((e) => e.id));
  const existingIds = new Set((existing ?? []).map((e) => e.id).filter((id) => !customIds.has(id)));
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

export interface SplitLongResult {
  ok: boolean;
  /** Attendus découpés. */
  count?: number;
  error?: string;
}

/**
 * « Découper les attendus trop longs » : chaque attendu qui en contient plusieurs est scindé. Le
 * premier fragment garde l'attendu (identité, rapprochements, séances liées) ; les suivants sont
 * créés sans lien, juste après lui. Les attendus ajoutés à la main ne sont pas touchés.
 */
export async function splitLongExpectations(moduleId: string): Promise<SplitLongResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: SESSION_EXPIRED };
  const { data: mod } = await supabase
    .from("module")
    .select("id, owner_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (!mod || mod.owner_id !== auth.user.id) return { ok: false, error: NOT_FOUND.module };

  const { data } = await supabase
    .from("module_expectation")
    .select("*")
    .eq("module_id", moduleId)
    .order("position");
  const rows = (data ?? []).filter((e) => (e as { origin?: string }).origin !== "custom");
  const plans = new Map(planExpectationSplits(rows).map((p) => [p.id, p]));
  if (plans.size === 0) return { ok: true, count: 0 };

  let position = 0;
  for (const row of (data ?? []) as typeof rows) {
    const plan = plans.get(row.id);
    if (plan) {
      const { error } = await supabase
        .from("module_expectation")
        .update({ label: plan.parts[0], position: position++ })
        .eq("id", row.id);
      if (error) return { ok: false, error: failure("découper", { kept: true }) };
      for (const label of plan.parts.slice(1)) {
        const { error: insertError } = await supabase
          .from("module_expectation")
          .insert({ module_id: moduleId, kind: "objective", label, position: position++ });
        if (insertError) return { ok: false, error: failure("découper", { kept: true }) };
      }
    } else {
      if (row.position !== position) {
        await supabase.from("module_expectation").update({ position }).eq("id", row.id);
      }
      position++;
    }
  }

  revalidatePath(`/modules/${moduleId}`);
  revalidatePath(`/modules/${moduleId}/expectations`);
  revalidatePath(`/modules/${moduleId}/matching`);
  return { ok: true, count: plans.size };
}

export interface CustomExpectationState {
  error?: string;
  saved?: boolean;
}

const UNAVAILABLE =
  "L’ajout d’attendus sera disponible après la mise à jour de la base de données.";

async function originAvailable(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.from("module_expectation").select("origin").limit(1);
  return !error;
}

/** Ajoute un attendu propre au module (« ajouté par l'intervenante »). */
export async function addCustomExpectation(
  moduleId: string,
  _prev: CustomExpectationState,
  formData: FormData,
): Promise<CustomExpectationState> {
  const cleaned = cleanCustomLabel(String(formData.get("label") ?? ""));
  if (!cleaned.ok) return { error: cleaned.error };
  const supabase = await createClient();
  if (!(await originAvailable(supabase))) return { error: UNAVAILABLE };
  const { data: mod } = await supabase.from("module").select("id").eq("id", moduleId).maybeSingle();
  if (!mod) return { error: NOT_FOUND.module };
  const { data: positions } = await supabase
    .from("module_expectation")
    .select("position")
    .eq("module_id", moduleId);
  const { error } = await supabase.from("module_expectation").insert({
    module_id: moduleId,
    kind: "objective",
    label: cleaned.label,
    origin: "custom",
    position: nextExpectationPosition((positions ?? []).map((p) => p.position)),
  });
  if (error) return { error: failure("ajouter l’attendu", { kept: true }) };
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath(`/modules/${moduleId}/expectations`);
  revalidatePath(`/modules/${moduleId}/matching`);
  return { saved: true };
}

/** Modifie le libellé d'un attendu ajouté à la main (jamais ceux de la fiche). */
export async function updateCustomExpectation(
  moduleId: string,
  expectationId: string,
  _prev: CustomExpectationState,
  formData: FormData,
): Promise<CustomExpectationState> {
  const cleaned = cleanCustomLabel(String(formData.get("label") ?? ""));
  if (!cleaned.ok) return { error: cleaned.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("module_expectation")
    .update({ label: cleaned.label })
    .eq("id", expectationId)
    .eq("module_id", moduleId)
    .eq("origin", "custom")
    .select("id");
  if (error) return { error: failure("modifier l’attendu", { kept: true }) };
  if (!data?.length) return { error: "Cet attendu n’existe plus." };
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath(`/modules/${moduleId}/expectations`);
  revalidatePath(`/modules/${moduleId}/matching`);
  return { saved: true };
}

/** Supprime un attendu ajouté à la main (ses liens avec les séances partent avec lui). */
export async function deleteCustomExpectation(
  moduleId: string,
  expectationId: string,
): Promise<CustomExpectationState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("module_expectation")
    .delete()
    .eq("id", expectationId)
    .eq("module_id", moduleId)
    .eq("origin", "custom");
  if (error) return { error: failure("supprimer l’attendu") };
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath(`/modules/${moduleId}/expectations`);
  revalidatePath(`/modules/${moduleId}/matching`);
  return { saved: true };
}
