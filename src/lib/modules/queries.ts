import {
  toExportCourses,
  type CourseExport,
  type ExportCourseRow,
} from "@/lib/modules/course-export";
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

export type LinkedResource = Pick<
  Tables<"resource">,
  "id" | "title" | "kind" | "audience" | "status"
>;

export type CourseWithResources = Tables<"course"> & {
  resources: LinkedResource[];
};

export async function getModuleCourses(moduleId: string): Promise<CourseWithResources[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select(
      "*, course_resource(resource:resource_id(id, title, kind, audience, status)), start_time, end_time",
    )
    .eq("module_id", moduleId)
    .order("position");

  return (data ?? []).map((c) => {
    const { course_resource, ...course } = c as unknown as Tables<"course"> & {
      course_resource: { resource: LinkedResource | null }[];
      start_time: string | null;
      end_time: string | null;
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
    .select(
      "*, course_resource(resource:resource_id(id, title, kind, audience, status)), start_time, end_time",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { course_resource, ...course } = data as unknown as Tables<"course"> & {
    course_resource: { resource: LinkedResource | null }[];
    start_time: string | null;
    end_time: string | null;
  };
  return {
    ...course,
    resources: course_resource.map((cr) => cr.resource).filter((r) => r !== null),
  };
}

/** Ressources actives, pour le sélecteur d'un cours. */
export async function listActiveResources(): Promise<LinkedResource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource")
    .select("id, title, kind, audience, status")
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

/**
 * Données du PDF « cours » (destiné aux étudiant·es) : séances dans l'ordre, avec le contenu
 * complet des ressources liées — sauf celles réservées à l'enseignante.
 */
export async function getCourseExport(moduleId: string): Promise<CourseExport | null> {
  const supabase = await createClient();
  const mod = await getModule(moduleId);
  if (!mod) return null;

  const { data } = await supabase
    .from("course")
    .select(
      "title, position, session_date, learning_objectives, material, course_resource(role, resource:resource_id(title, description, content, url, audience, status))",
    )
    .eq("module_id", moduleId)
    .order("position");

  return {
    module: {
      name: mod.name,
      ycode: mod.ycode,
      schoolName: mod.school?.name ?? null,
      level: mod.level,
      year: mod.year,
    },
    courses: toExportCourses((data ?? []) as unknown as ExportCourseRow[]),
  };
}

/**
 * Ressources complètes d'une séance, principale d'abord. Toutes audiences confondues :
 * passer par `studentFacing()` avant toute diffusion aux étudiant·es.
 */
export async function getCourseResourcesFull(courseId: string): Promise<Tables<"resource">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_resource")
    .select("role, resource:resource_id(*)")
    .eq("course_id", courseId);

  return ((data ?? []) as unknown as { role: string; resource: Tables<"resource"> | null }[])
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1))
    .map((cr) => cr.resource)
    .filter((r) => r !== null);
}

/** Ressources distinctes d'un module, dans l'ordre des séances (même avertissement). */
export async function getModuleResourcesFull(moduleId: string): Promise<Tables<"resource">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select("position, course_resource(role, resource:resource_id(*))")
    .eq("module_id", moduleId)
    .order("position");

  const seen = new Map<string, Tables<"resource">>();
  for (const c of (data ?? []) as unknown as {
    course_resource: { role: string; resource: Tables<"resource"> | null }[];
  }[]) {
    for (const cr of [...c.course_resource].sort((a, b) =>
      a.role === b.role ? 0 : a.role === "primary" ? -1 : 1,
    )) {
      if (cr.resource && !seen.has(cr.resource.id)) seen.set(cr.resource.id, cr.resource);
    }
  }
  return Array.from(seen.values());
}
