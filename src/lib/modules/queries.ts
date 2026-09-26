import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export interface ModuleWithSchool extends Tables<"module"> {
  school: Pick<Tables<"school">, "id" | "name"> | null;
}

/** Modules actifs par défaut ; `includeArchived` ajoute les modules archivés (années passées). */
export async function listModules(
  opts: { includeArchived?: boolean } = {},
): Promise<ModuleWithSchool[]> {
  const supabase = await createClient();
  let query = supabase.from("module").select("*, school:school_id(id, name)");
  if (!opts.includeArchived) query = query.is("archived_at", null);
  const { data } = await query.order("year", { ascending: false }).order("name");
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

export async function getModuleDocuments(moduleId: string): Promise<Tables<"module_document">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_document")
    .select("*")
    .eq("module_id", moduleId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export interface CourseExport {
  module: {
    name: string;
    ycode: string | null;
    schoolName: string | null;
    level: string | null;
    year: number;
  };
  courses: {
    number: number;
    title: string;
    sessionDate: string | null;
    objectives: string[];
    material: string | null;
    resources: {
      title: string;
      description: string | null;
      content: string | null;
      url: string | null;
    }[];
  }[];
}

/** Données du PDF « cours » : séances dans l'ordre, avec le contenu complet des ressources liées. */
export async function getCourseExport(moduleId: string): Promise<CourseExport | null> {
  const supabase = await createClient();
  const mod = await getModule(moduleId);
  if (!mod) return null;

  const { data } = await supabase
    .from("course")
    .select(
      "title, position, session_date, learning_objectives, material, course_resource(role, resource:resource_id(title, description, content, url))",
    )
    .eq("module_id", moduleId)
    .order("position");

  type Row = {
    title: string;
    session_date: string | null;
    learning_objectives: string[];
    material: string | null;
    course_resource: {
      role: string;
      resource: {
        title: string;
        description: string | null;
        content: string | null;
        url: string | null;
      } | null;
    }[];
  };

  return {
    module: {
      name: mod.name,
      ycode: mod.ycode,
      schoolName: mod.school?.name ?? null,
      level: mod.level,
      year: mod.year,
    },
    courses: ((data ?? []) as unknown as Row[]).map((c, i) => ({
      number: i + 1,
      title: c.title,
      sessionDate: c.session_date,
      objectives: c.learning_objectives,
      material: c.material,
      // Ressource principale d'abord, puis les secondaires.
      resources: [...c.course_resource]
        .sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1))
        .map((cr) => cr.resource)
        .filter((r) => r !== null),
    })),
  };
}
