import { schoolYear } from "@/lib/ynov/teacher-name";
import { cache } from "react";

import {
  toExportCourses,
  type CourseExport,
  type ExportCourseRow,
} from "@/lib/modules/course-export";
import type { ImportableCourse } from "@/lib/modules/course-import";
import { getCourseResourceOrder } from "@/lib/modules/course-plan-queries";
import { orderResources } from "@/lib/modules/session-builder";
import { filterSections } from "@/lib/resources/sections";
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

/** Mis en cache le temps d'une requête : `generateMetadata` et la page partagent le même appel. */
export const getModule = cache(async (id: string): Promise<ModuleWithSchool | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module")
    .select("*, school:school_id(id, name)")
    .eq("id", id)
    .maybeSingle();
  return data as ModuleWithSchool | null;
});

export type LinkedResource = Pick<
  Tables<"resource">,
  "id" | "title" | "kind" | "audience" | "status" | "category"
>;

export type CourseWithResources = Tables<"course"> & {
  resources: LinkedResource[];
};

async function loadModuleCourses(moduleId: string): Promise<CourseWithResources[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select("*, course_resource(resource:resource_id(id, title, kind, audience, status, category))")
    .eq("module_id", moduleId)
    .order("position")
    .order("created_at");

  return (data ?? []).map((c) => {
    const { course_resource, ...course } = c as unknown as Tables<"course"> & {
      course_resource: { resource: LinkedResource | null }[];
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
    .select("*, course_resource(resource:resource_id(id, title, kind, audience, status, category))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { course_resource, ...course } = data as unknown as Tables<"course"> & {
    course_resource: { resource: LinkedResource | null }[];
  };
  return {
    ...course,
    resources: course_resource.map((cr) => cr.resource).filter((r) => r !== null),
  };
}

/**
 * Ressource du sélecteur : titre, type, matière, tags, état et un début de description. Le contenu
 * (long : cours entiers) n'est jamais envoyé au navigateur ; la recherche dans le contenu se fait
 * côté serveur (`searchResourceContent`).
 */
export type PickerSource = LinkedResource & Pick<Tables<"resource">, "description" | "tags">;

const PICKER_DESCRIPTION_LIMIT = 200;

/** Ressources actives, pour le sélecteur d'un cours. */
export async function listActiveResources(): Promise<PickerSource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource")
    .select("id, title, kind, audience, status, category, description, tags")
    .is("archived_at", null)
    .order("title");
  return (data ?? []).map((r) => ({
    ...r,
    description: r.description?.slice(0, PICKER_DESCRIPTION_LIMIT) ?? null,
  }));
}

/** Ressources retenues du module (US-55), dans l'ordre où elles ont été retenues. */
export async function getRetainedResources(moduleId: string): Promise<LinkedResource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_resource")
    .select("created_at, resource:resource_id(id, title, kind, audience, status, category)")
    .eq("module_id", moduleId)
    .order("created_at");
  return ((data ?? []) as unknown as { resource: LinkedResource | null }[])
    .map((row) => row.resource)
    .filter((r) => r !== null);
}

/** Modules actifs (nom, année) où l'on peut retenir une ressource. */
export async function listActiveModules(): Promise<{ id: string; name: string; year: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module")
    .select("id, name, year")
    .is("archived_at", null)
    .order("year", { ascending: false })
    .order("name");
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
      "id, title, position, session_date, learning_objectives, material, course_resource(role, resource:resource_id(id, title, description, content, url, audience, status, files, updated_at))",
    )
    .eq("module_id", moduleId)
    .order("position");
  // PDF des étudiant·es : seulement les parties choisies pour chaque séance.
  const rows = (data ?? []) as unknown as (ExportCourseRow & { id: string })[];
  const choices = await loadSectionChoices(rows.map((c) => c.id));
  for (const c of rows) {
    for (const cr of c.course_resource) {
      const choice = cr.resource?.id ? choices.get(`${c.id}|${cr.resource.id}`) : undefined;
      if (cr.resource && choice) {
        cr.resource = {
          ...cr.resource,
          content: filterSections(cr.resource.content, choice.selected),
        };
      }
    }
  }

  return {
    module: {
      name: mod.name,
      ycode: mod.ycode,
      schoolName: mod.school?.name ?? null,
      level: mod.level,
      year: mod.year,
      schoolYear: schoolYear(mod.first_session_date, mod.year),
    },
    courses: toExportCourses(rows),
  };
}

/**
 * Ressources complètes d'une séance, principale d'abord. Toutes audiences confondues :
 * passer par `studentFacing()` avant toute diffusion aux étudiant·es.
 */
export interface SectionChoice {
  selected: string[] | null;
  known: string[] | null;
}

/**
 * Parties choisies par séance (clé `séance|ressource`). Sans les colonnes (migration pas encore
 * appliquée) : vide, et chaque séance montre le cours entier.
 */
export async function loadSectionChoices(courseIds: string[]): Promise<Map<string, SectionChoice>> {
  const out = new Map<string, SectionChoice>();
  if (courseIds.length === 0) return out;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_resource")
    .select("course_id, resource_id, selected_sections, known_sections")
    .in("course_id", courseIds);
  if (error) return out;
  for (const r of data ?? []) {
    if (r.selected_sections) {
      out.set(`${r.course_id}|${r.resource_id}`, {
        selected: r.selected_sections,
        known: r.known_sections,
      });
    }
  }
  return out;
}

/**
 * Ressources de la séance, contenu réduit aux parties choisies pour elle (projection, vue privée,
 * espace étudiant·es). `raw` : contenu entier (choix des parties).
 */
export async function getCourseResourcesFull(
  courseId: string,
  options: { raw?: boolean } = {},
): Promise<Tables<"resource">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_resource")
    .select("role, resource:resource_id(*)")
    .eq("course_id", courseId);

  const ordered = (
    (data ?? []) as unknown as { role: string; resource: Tables<"resource"> | null }[]
  )
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1))
    .map((cr) => cr.resource)
    .filter((r) => r !== null);
  // Ordre choisi dans « Construire les séances » (US-124), sinon principale d'abord.
  const sorted = orderResources(ordered, await getCourseResourceOrder(courseId));
  if (options.raw) return sorted;
  const choices = await loadSectionChoices([courseId]);
  return sorted.map((r) => {
    const choice = choices.get(`${courseId}|${r.id}`);
    return choice ? { ...r, content: filterSections(r.content, choice.selected) } : r;
  });
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

export type ModuleExpectation = Tables<"module_expectation">;

/** Attendus de l'école pour le module (US-53) : objectifs, puis unités, dans l'ordre saisi. */
export async function getModuleExpectations(moduleId: string): Promise<ModuleExpectation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_expectation")
    .select("*")
    .eq("module_id", moduleId)
    .order("position");
  return data ?? [];
}

export interface ImportSource {
  id: string;
  name: string;
  year: number;
  archived: boolean;
  courseCount: number;
}

/** Modules (actifs et archivés) dont on peut reprendre des séances, sauf le module courant (US-58). */
export async function listImportSources(excludeId: string): Promise<ImportSource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module")
    .select("id, name, year, archived_at, course(count)")
    .neq("id", excludeId)
    .order("year", { ascending: false })
    .order("name");
  return (
    (data ?? []) as unknown as {
      id: string;
      name: string;
      year: number;
      archived_at: string | null;
      course: { count: number }[];
    }[]
  )
    .map((m) => ({
      id: m.id,
      name: m.name,
      year: m.year,
      archived: m.archived_at !== null,
      courseCount: m.course[0]?.count ?? 0,
    }))
    .filter((m) => m.courseCount > 0);
}

/** Séances d'un module avec les liens vers leurs ressources, dans l'ordre (US-58). */
export async function getImportableCourses(moduleId: string): Promise<ImportableCourse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select(
      "id, title, type, position, learning_objectives, animation_notes, assessment_notes, material, course_resource(resource_id, role)",
    )
    .eq("module_id", moduleId)
    .order("position")
    .order("created_at");
  return (
    (data ?? []) as unknown as (Omit<ImportableCourse, "resourceLinks"> & {
      course_resource: ImportableCourse["resourceLinks"];
    })[]
  ).map(({ course_resource, ...c }) => ({ ...c, resourceLinks: course_resource }));
}

/** Séances d'un module, une seule requête par rendu (layouts et page la partagent). */
export const getModuleCourses = cache(loadModuleCourses);
