import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export interface ModuleWithSchool extends Tables<"module"> {
  school: Pick<Tables<"school">, "id" | "name"> | null;
}

export async function listModules(): Promise<ModuleWithSchool[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module")
    .select("*, school:school_id(id, name)")
    .order("year", { ascending: false })
    .order("name");
  return (data ?? []) as ModuleWithSchool[];
}

export async function listSchools(): Promise<Pick<Tables<"school">, "id" | "name">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("school").select("id, name").order("name");
  return data ?? [];
}

export async function getModule(id: string): Promise<ModuleWithSchool | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module")
    .select("*, school:school_id(id, name)")
    .eq("id", id)
    .maybeSingle();
  return data as ModuleWithSchool | null;
}

export interface CourseWithResources extends Tables<"course"> {
  resources: Pick<Tables<"resource">, "id" | "title">[];
}

export async function getModuleCourses(moduleId: string): Promise<CourseWithResources[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select("*, course_resource(resource:resource_id(id, title))")
    .eq("module_id", moduleId)
    .order("position");

  return (data ?? []).map((c) => {
    const { course_resource, ...course } = c as unknown as Tables<"course"> & {
      course_resource: { resource: Pick<Tables<"resource">, "id" | "title"> | null }[];
    };
    return {
      ...course,
      resources: course_resource.map((cr) => cr.resource).filter((r) => r !== null),
    };
  });
}

export async function getCourse(id: string): Promise<CourseWithResources | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select("*, course_resource(resource:resource_id(id, title))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { course_resource, ...course } = data as unknown as Tables<"course"> & {
    course_resource: { resource: Pick<Tables<"resource">, "id" | "title"> | null }[];
  };
  return {
    ...course,
    resources: course_resource.map((cr) => cr.resource).filter((r) => r !== null),
  };
}

/** Ressources actives, pour le sélecteur d'un cours. */
export async function listActiveResources(): Promise<Pick<Tables<"resource">, "id" | "title">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource")
    .select("id, title")
    .is("archived_at", null)
    .order("title");
  return data ?? [];
}
