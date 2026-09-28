"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  diffCriteria,
  readCriteriaInput,
  type CriterionInput,
  type ExistingCriterion,
} from "@/lib/assessments/grid-criteria";
import type { LevelInput } from "@/lib/assessments/levels";
import { readGridForm } from "@/lib/assessments/schema";
import { createClient } from "@/lib/supabase/server";

export interface GridFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** La suppression d'au moins un critère noté nécessite une confirmation avant d'enregistrer. */
  confirmRequired?: boolean;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

function validateCriteria(raw: string): { criteria: CriterionInput[] } | { error: string } {
  return readCriteriaInput(raw);
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Remplace les paliers des critères donnés. Les notes (`grade.scores`) stockent des points, pas des
 * identifiants de palier : réécrire les paliers ne perd donc aucune saisie.
 */
async function replaceLevels(
  supabase: Supabase,
  levelsByCriterion: Map<string, LevelInput[]>,
): Promise<boolean> {
  const ids = [...levelsByCriterion.keys()];
  if (ids.length === 0) return true;
  const { error: deleteError } = await supabase
    .from("criterion_level")
    .delete()
    .in("grid_criterion_id", ids);
  if (deleteError) return false;

  const rows = ids.flatMap((id) =>
    (levelsByCriterion.get(id) ?? []).map((l, position) => ({
      grid_criterion_id: id,
      points: l.points,
      description: l.description,
      position,
    })),
  );
  if (rows.length === 0) return true;
  const { error } = await supabase.from("criterion_level").insert(rows);
  return !error;
}

export async function createGrid(_prev: GridFormState, formData: FormData): Promise<GridFormState> {
  const parsed = readGridForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const validated = validateCriteria(parsed.data.criteriaJson);
  if ("error" in validated) return { error: validated.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grading_grid")
    .insert({ name: parsed.data.name, description: parsed.data.description || null })
    .select("id")
    .single();
  if (error || !data) return { error: "Enregistrement impossible." };

  const { data: created, error: criteriaError } = await supabase
    .from("grid_criterion")
    .insert(
      validated.criteria.map((c, i) => ({
        grading_grid_id: data.id,
        label: c.label,
        weight: c.weight,
        description: c.description || null,
        position: i,
      })),
    )
    .select("id, position");
  if (criteriaError || !created) return { error: "Enregistrement impossible." };

  const levels = new Map(
    created.map((row) => [row.id, validated.criteria[row.position].levels ?? []]),
  );
  if (!(await replaceLevels(supabase, levels))) return { error: "Enregistrement impossible." };

  revalidatePath("/assessments/grids");
  redirect("/assessments/grids");
}

/** Critères supprimés qui sont notés dans au moins une évaluation utilisant cette grille. */
async function findUsedDeletedCriteria(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gridId: string,
  existing: ExistingCriterion[],
  deletedIds: string[],
): Promise<{ count: number; labels: string[]; affectedGradeIds: string[] }> {
  if (deletedIds.length === 0) return { count: 0, labels: [], affectedGradeIds: [] };

  const { data: assessments } = await supabase
    .from("assessment")
    .select("id")
    .eq("grading_grid_id", gridId);
  const assessmentIds = (assessments ?? []).map((a) => a.id);
  if (assessmentIds.length === 0) return { count: 0, labels: [], affectedGradeIds: [] };

  const { data: grades } = await supabase
    .from("grade")
    .select("id, scores")
    .in("assessment_id", assessmentIds);

  const deletedSet = new Set(deletedIds);
  const usedIds = new Set<string>();
  const affectedGradeIds: string[] = [];
  for (const g of grades ?? []) {
    const keys = Object.keys((g.scores as Record<string, number>) ?? {});
    const hit = keys.filter((k) => deletedSet.has(k));
    if (hit.length) {
      affectedGradeIds.push(g.id);
      for (const k of hit) usedIds.add(k);
    }
  }

  const labels = existing.filter((c) => usedIds.has(c.id)).map((c) => c.label);
  return { count: affectedGradeIds.length, labels, affectedGradeIds };
}

/** Retire les clés des critères supprimés de `grade.scores` (la note globale `value` est conservée telle quelle). */
async function cleanupGradeScores(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gradeIds: string[],
  deletedIds: string[],
) {
  if (gradeIds.length === 0) return;
  const { data: grades } = await supabase.from("grade").select("id, scores").in("id", gradeIds);
  const deletedSet = new Set(deletedIds);
  for (const g of grades ?? []) {
    const scores = { ...((g.scores as Record<string, number>) ?? {}) };
    for (const k of deletedSet) delete scores[k];
    await supabase.from("grade").update({ scores }).eq("id", g.id);
  }
}

export async function updateGrid(
  id: string,
  _prev: GridFormState,
  formData: FormData,
): Promise<GridFormState> {
  const parsed = readGridForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const validated = validateCriteria(parsed.data.criteriaJson);
  if ("error" in validated) return { error: validated.error };

  const supabase = await createClient();
  const { data: existingRows } = await supabase
    .from("grid_criterion")
    .select("id, label, weight, description")
    .eq("grading_grid_id", id);
  const existing: ExistingCriterion[] = existingRows ?? [];

  const diff = diffCriteria(existing, validated.criteria);

  let affectedGradeIds: string[] = [];
  if (diff.toDelete.length && !parsed.data.confirmDeleteCriteria) {
    const used = await findUsedDeletedCriteria(supabase, id, existing, diff.toDelete);
    if (used.count > 0) {
      const list = used.labels.map((l) => `« ${l} »`).join(", ");
      return {
        confirmRequired: true,
        error: `${used.count} note${used.count > 1 ? "s utilisent" : " utilise"} le critère ${list} : sa suppression effacera ce détail (la note globale est conservée). Confirmez pour continuer.`,
      };
    }
  } else if (diff.toDelete.length) {
    const used = await findUsedDeletedCriteria(supabase, id, existing, diff.toDelete);
    affectedGradeIds = used.affectedGradeIds;
  }

  const { error: gridError } = await supabase
    .from("grading_grid")
    .update({ name: parsed.data.name, description: parsed.data.description || null })
    .eq("id", id);
  if (gridError) return { error: "Enregistrement impossible." };

  const levelsByCriterion = new Map<string, LevelInput[]>();

  for (const c of diff.toUpdate) {
    levelsByCriterion.set(c.id, c.levels);
    const { error } = await supabase
      .from("grid_criterion")
      .update({
        label: c.label,
        weight: c.weight,
        description: c.description,
        position: c.position,
      })
      .eq("id", c.id);
    if (error) return { error: "Enregistrement impossible." };
  }

  if (diff.toInsert.length) {
    const { data: inserted, error } = await supabase
      .from("grid_criterion")
      .insert(
        diff.toInsert.map((c) => ({
          grading_grid_id: id,
          label: c.label,
          weight: c.weight,
          description: c.description,
          position: c.position,
        })),
      )
      .select("id, position");
    if (error || !inserted) return { error: "Enregistrement impossible." };
    for (const row of inserted) {
      const source = diff.toInsert.find((c) => c.position === row.position);
      levelsByCriterion.set(row.id, source?.levels ?? []);
    }
  }

  if (!(await replaceLevels(supabase, levelsByCriterion))) {
    return { error: "Enregistrement impossible." };
  }

  if (diff.toDelete.length) {
    await cleanupGradeScores(supabase, affectedGradeIds, diff.toDelete);
    const { error } = await supabase.from("grid_criterion").delete().in("id", diff.toDelete);
    if (error) return { error: "Enregistrement impossible." };
  }

  revalidatePath("/assessments/grids");
  redirect("/assessments/grids");
}

export async function deleteGrid(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("grading_grid").delete().eq("id", id);
  revalidatePath("/assessments/grids");
  redirect("/assessments/grids");
}
