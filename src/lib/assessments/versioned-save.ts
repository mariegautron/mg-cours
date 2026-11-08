import "server-only";

import { decideFieldSave } from "@/lib/assessments/oral-space";
import { failure } from "@/lib/messages";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type SaveFieldResult =
  | { ok: true; version: number }
  | { ok: false; conflict: true; version: number; theirs: string }
  | { ok: false; conflict?: false; error: string };

interface VersionedRow {
  id: string;
  updated_at: string;
  field_versions: Json;
}

const asObject = (v: Json | undefined): Record<string, Json> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, Json>) : {};

/**
 * Enregistrement d'UN champ avec sa version, commun aux espaces de correction (oral, questions
 * ouvertes). Une saisie plus récente n'est jamais écrasée : si le champ a changé ailleurs avec un
 * autre contenu, on renvoie les deux versions et Marie choisit. `force` : elle garde la sienne.
 */
export async function saveVersionedField<Row extends VersionedRow>(opts: {
  supabase: Supabase;
  table: "oral_space" | "open_review";
  load: () => Promise<Row | null>;
  field: string;
  value: string;
  baseVersion: number;
  force?: boolean;
  readField: (row: Row, field: string) => string;
  patchFor: (row: Row, field: string, value: string) => Record<string, unknown> | { error: string };
  /** Refus avant toute écriture (ex. copie verrouillée). */
  guard?: (row: Row) => string | null;
}): Promise<SaveFieldResult> {
  const { supabase, table, load, field, value, baseVersion, force, readField, patchFor, guard } =
    opts;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await load();
    if (!row) return { ok: false, error: "Introuvable." };
    const blocked = guard?.(row);
    if (blocked) return { ok: false, error: blocked };
    const versions = asObject(row.field_versions);
    const stored = typeof versions[field] === "number" ? (versions[field] as number) : 0;
    const outcome = decideFieldSave(
      { value: readField(row, field), version: stored },
      { baseVersion: force ? stored : baseVersion, value },
    );
    if (outcome.kind === "conflict")
      return { ok: false, conflict: true, version: outcome.version, theirs: outcome.theirs };
    if (outcome.kind === "same") return { ok: true, version: outcome.version };
    const patch = patchFor(row, field, value);
    if ("error" in patch && typeof patch.error === "string")
      return { ok: false, error: patch.error };
    // Écriture conditionnelle : si la ligne a bougé entre la lecture et l'écriture, on relit.
    const { data: updated, error } = await supabase
      .from(table)
      .update({ ...patch, field_versions: { ...versions, [field]: outcome.version } } as never)
      .eq("id", row.id)
      .eq("updated_at", row.updated_at)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: failure("enregistrer", { kept: true }) };
    if (updated) return { ok: true, version: outcome.version };
  }
  return { ok: false, error: failure("enregistrer", { kept: true }) };
}
