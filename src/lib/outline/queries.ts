import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { buildOutlineContent, type OutlineContent } from "@/lib/ynov/outline";
import type { Tables } from "@/types/db";

export async function getOutline(moduleId: string): Promise<Tables<"pedagogical_outline"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedagogical_outline")
    .select("*")
    .eq("module_id", moduleId)
    .maybeSingle();
  return data;
}

export async function getTeacherName(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("teacher_profile").select("legal_name").maybeSingle();
  return data?.legal_name ?? "";
}

/** Construit le contenu actuel de la trame à partir de l'état courant du module. */
export async function buildCurrentOutline(moduleId: string): Promise<OutlineContent | null> {
  const [mod, courses, teacherName] = await Promise.all([
    getModule(moduleId),
    getModuleCourses(moduleId),
    getTeacherName(),
  ]);
  if (!mod) return null;
  return buildOutlineContent({ teacherName, module: mod, courses });
}
