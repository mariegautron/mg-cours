"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readModuleForm } from "@/lib/modules/schema";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export interface ModuleFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

function toRow(input: ReturnType<typeof readModuleForm>["data"]) {
  if (!input) return null;
  return {
    name: input.name,
    school_id: input.schoolId,
    level: input.level || null,
    year: input.year,
    ycode: input.ycode || null,
    total_hours: input.totalHours,
    hours_lecture: input.hoursLecture,
    hours_td: input.hoursTd,
    hours_tp: input.hoursTp,
    start_date: input.startDate,
    first_session_date: input.firstSessionDate,
    end_date: input.endDate,
    purchase_order_ref: input.purchaseOrderRef || null,
  };
}

export async function createModule(
  _prev: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const parsed = readModuleForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("module")
    .insert(toRow(parsed.data)!)
    .select("id")
    .single();

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/modules");
  redirect(`/modules/${data.id}`);
}

export async function updateModule(
  id: string,
  _prev: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const parsed = readModuleForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { error } = await supabase.from("module").update(toRow(parsed.data)!).eq("id", id);
  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/modules");
  revalidatePath(`/modules/${id}`);
  redirect(`/modules/${id}`);
}

export async function deleteModule(id: string) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.from("module").delete().eq("id", id);
  if (error) return;
  revalidatePath("/modules");
  redirect("/modules");
}

export async function setAdminDoc(id: string, key: string, value: boolean) {
  "use server";
  const supabase = await createClient();
  const { data: mod } = await supabase.from("module").select("admin_docs").eq("id", id).single();
  const adminDocs = { ...((mod?.admin_docs as Record<string, boolean>) ?? {}), [key]: value };
  await supabase.from("module").update({ admin_docs: adminDocs }).eq("id", id);
  revalidatePath(`/modules/${id}`);
}

export interface DuplicateState {
  error?: string;
}

/** Duplique un module (+ ses cours et leurs ressources liées) vers une nouvelle année. */
export async function duplicateModule(
  sourceId: string,
  _prev: DuplicateState,
  formData: FormData,
): Promise<DuplicateState> {
  const year = Number(formData.get("year"));
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { error: "Année invalide." };
  }

  const supabase = await createClient();
  const { data: source } = await supabase.from("module").select("*").eq("id", sourceId).single();
  if (!source) return { error: "Module introuvable." };

  const { data: newModule, error: moduleError } = await supabase
    .from("module")
    .insert({
      name: source.name,
      school_id: source.school_id,
      level: source.level,
      year,
      ycode: source.ycode,
      total_hours: source.total_hours,
      hours_lecture: source.hours_lecture,
      hours_td: source.hours_td,
      hours_tp: source.hours_tp,
      // Dates et statut administratif repartent à zéro pour la nouvelle année.
    })
    .select("id")
    .single();

  if (moduleError || !newModule) return { error: "Duplication impossible. Réessayez." };

  const { data: courses } = await supabase
    .from("course")
    .select("*, course_resource(resource_id, role)")
    .eq("module_id", sourceId)
    .order("position");

  for (const c of (courses ?? []) as (Tables<"course"> & {
    course_resource: { resource_id: string; role: string }[];
  })[]) {
    const { data: newCourse } = await supabase
      .from("course")
      .insert({
        module_id: newModule.id,
        title: c.title,
        position: c.position,
        session_date: c.session_date,
        type: c.type,
        learning_objectives: c.learning_objectives,
        animation_notes: c.animation_notes,
        assessment_notes: c.assessment_notes,
        material: c.material,
        prep_status: c.prep_status,
      })
      .select("id")
      .single();

    if (newCourse && c.course_resource.length) {
      await supabase.from("course_resource").insert(
        c.course_resource.map((cr) => ({
          course_id: newCourse.id,
          resource_id: cr.resource_id,
          role: cr.role as "primary" | "secondary",
        })),
      );
    }
  }

  revalidatePath("/modules");
  redirect(`/modules/${newModule.id}`);
}
