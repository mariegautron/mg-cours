"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCriteriaLines, readGridForm } from "@/lib/assessments/schema";
import { createClient } from "@/lib/supabase/server";

export interface GridFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

function validateCriteria(
  text: string,
): { criteria: { label: string; weight: number }[] } | { error: string } {
  const parsed = parseCriteriaLines(text);
  const bad = parsed.find((c) => c.error);
  if (bad) return { error: `Ligne ${bad.lineNumber} : ${bad.error}.` };
  if (parsed.length === 0) return { error: "Ajoutez au moins un critère." };
  return { criteria: parsed.map(({ label, weight }) => ({ label, weight })) };
}

export async function createGrid(_prev: GridFormState, formData: FormData): Promise<GridFormState> {
  const parsed = readGridForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const validated = validateCriteria(parsed.data.criteriaText);
  if ("error" in validated) return { error: validated.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grading_grid")
    .insert({ name: parsed.data.name, description: parsed.data.description || null })
    .select("id")
    .single();
  if (error || !data) return { error: "Enregistrement impossible." };

  await supabase.from("grid_criterion").insert(
    validated.criteria.map((c, i) => ({
      grading_grid_id: data.id,
      label: c.label,
      weight: c.weight,
      position: i,
    })),
  );

  revalidatePath("/assessments/grids");
  redirect("/assessments/grids");
}

export async function updateGrid(
  id: string,
  _prev: GridFormState,
  formData: FormData,
): Promise<GridFormState> {
  const parsed = readGridForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const validated = validateCriteria(parsed.data.criteriaText);
  if ("error" in validated) return { error: validated.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("grading_grid")
    .update({ name: parsed.data.name, description: parsed.data.description || null })
    .eq("id", id);
  if (error) return { error: "Enregistrement impossible." };

  await supabase.from("grid_criterion").delete().eq("grading_grid_id", id);
  await supabase.from("grid_criterion").insert(
    validated.criteria.map((c, i) => ({
      grading_grid_id: id,
      label: c.label,
      weight: c.weight,
      position: i,
    })),
  );

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
