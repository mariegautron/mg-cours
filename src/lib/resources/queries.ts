import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

import type { ResourceListFilters } from "./filters";
import { searchResources, type SearchExcerpt } from "./search";

export interface ResourceWithUsage extends Tables<"resource"> {
  /** Nombre de modules distincts où la ressource est utilisée. */
  moduleCount: number;
  /** US-56 : extrait où figure la recherche (hors titre), s'il y en a une. */
  excerpt?: SearchExcerpt | null;
}

/**
 * Nombre de modules distincts par ressource : retenue pour le module (module_resource) ou au
 * déroulé d'une de ses séances (course_resource). Même calcul que « Où elle sert ».
 */
async function moduleUsage(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const [{ data: inCourses }, { data: retained }] = await Promise.all([
    supabase.from("course_resource").select("resource_id, course:course_id(module_id)"),
    supabase.from("module_resource").select("resource_id, module_id"),
  ]);

  const byResource = new Map<string, Set<string>>();
  const add = (resourceId: string, moduleId: string | undefined) => {
    if (!moduleId) return;
    const set = byResource.get(resourceId) ?? new Set<string>();
    set.add(moduleId);
    byResource.set(resourceId, set);
  };
  for (const row of inCourses ?? []) {
    add(row.resource_id, (row.course as { module_id: string } | null)?.module_id);
  }
  for (const row of retained ?? []) add(row.resource_id, row.module_id);
  return new Map(Array.from(byResource, ([id, set]) => [id, set.size]));
}

const RESOURCE_LIST_COLUMNS =
  "id, owner_id, title, description, url, category, tags, files, archived_at, created_at, updated_at, kind, audience, status, intent_note";

export async function listResources(
  filters: ResourceListFilters = {},
): Promise<ResourceWithUsage[]> {
  const supabase = await createClient();
  // Le contenu (long : cours entiers) n'est lu que pour la recherche ; la liste n'en a pas besoin.
  const searching = Boolean(filters.q?.trim());
  let query = supabase
    .from("resource")
    .select(searching ? "*" : RESOURCE_LIST_COLUMNS)
    .order("updated_at", { ascending: false });

  if (!filters.archived) query = query.is("archived_at", null);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.tag) query = query.contains("tags", [filters.tag]);
  if (filters.kind === "none") query = query.is("kind", null);
  else if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.audience) query = query.eq("audience", filters.audience);
  if (filters.status) query = query.eq("status", filters.status);

  const [{ data: rows }, usage] = await Promise.all([query, moduleUsage()]);
  const data = ((rows ?? []) as unknown as Omit<Tables<"resource">, "content">[]).map((r) => ({
    content: null,
    ...r,
  })) as Tables<"resource">[];
  // La recherche (titre, description, tags, contenu ; sans accent ni casse) se fait ici : le
  // volume est celui d'une bibliothèque personnelle et Postgres ne replie pas les accents.
  return searchResources(data ?? [], filters.q ?? "").map(({ resource, excerpt }) => ({
    ...resource,
    moduleCount: usage.get(resource.id) ?? 0,
    excerpt,
  }));
}

/** Catégories et tags distincts présents en base (pour les filtres). */
export async function resourceFacets(): Promise<{ categories: string[]; tags: string[] }> {
  const supabase = await createClient();
  const { data } = await supabase.from("resource").select("category, tags").is("archived_at", null);

  const categories = new Set<string>();
  const tags = new Set<string>();
  for (const row of data ?? []) {
    if (row.category) categories.add(row.category);
    for (const t of row.tags ?? []) tags.add(t);
  }
  return {
    categories: Array.from(categories).sort((a, b) => a.localeCompare(b, "fr")),
    tags: Array.from(tags).sort((a, b) => a.localeCompare(b, "fr")),
  };
}

export async function getResource(id: string): Promise<ResourceWithUsage | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("resource").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const usage = await moduleUsage();
  return { ...data, moduleCount: usage.get(data.id) ?? 0 };
}

/** Modules (nom + année) où la ressource est utilisée. */
export async function getResourceModules(
  id: string,
): Promise<Pick<Tables<"module">, "id" | "name" | "year">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_resource")
    .select("course:course_id(module:module_id(id, name, year))")
    .eq("resource_id", id);

  const seen = new Map<string, Pick<Tables<"module">, "id" | "name" | "year">>();
  for (const row of data ?? []) {
    const m = (
      row.course as { module: Pick<Tables<"module">, "id" | "name" | "year"> | null } | null
    )?.module;
    if (m) seen.set(m.id, m);
  }
  return Array.from(seen.values()).sort((a, b) => b.year - a.year);
}

export async function listResourceVersions(
  resourceId: string,
): Promise<Tables<"resource_version">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource_version")
    .select("*")
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export interface ResourceModuleUsage {
  id: string;
  name: string;
  year: number;
  archived: boolean;
  /** Séances où la ressource est au déroulé (« Séance 2 · Titre »). */
  sessions: { courseId: string; label: string }[];
}

/** « Où elle sert » : chaque module (retenue ou au déroulé) et, dessous, ses séances. */
export async function getResourceUsage(id: string): Promise<ResourceModuleUsage[]> {
  const supabase = await createClient();
  const [{ data: inCourses }, { data: retained }] = await Promise.all([
    supabase
      .from("course_resource")
      .select(
        "course:course_id(id, title, position, module:module_id(id, name, year, archived_at))",
      )
      .eq("resource_id", id),
    supabase
      .from("module_resource")
      .select("module:module_id(id, name, year, archived_at)")
      .eq("resource_id", id),
  ]);
  type Mod = { id: string; name: string; year: number; archived_at: string | null };
  const byModule = new Map<string, ResourceModuleUsage>();
  const ensure = (m: Mod) => {
    const known = byModule.get(m.id);
    if (known) return known;
    const entry = { id: m.id, name: m.name, year: m.year, archived: !!m.archived_at, sessions: [] };
    byModule.set(m.id, entry);
    return entry;
  };
  for (const row of retained ?? []) {
    const m = row.module as Mod | null;
    if (m) ensure(m);
  }
  for (const row of inCourses ?? []) {
    const c = row.course as {
      id: string;
      title: string;
      position: number;
      module: Mod | null;
    } | null;
    if (!c?.module) continue;
    ensure(c.module).sessions.push({ courseId: c.id, label: c.title });
  }
  // Numéro de séance : rang dans le module (comme la liste des séances).
  const moduleIds = [...byModule.keys()];
  if (moduleIds.length) {
    const { data: all } = await supabase
      .from("course")
      .select("id, module_id, position, created_at")
      .in("module_id", moduleIds)
      .order("position")
      .order("created_at");
    const rank = new Map<string, number>();
    const counter = new Map<string, number>();
    for (const c of all ?? []) {
      const n = (counter.get(c.module_id) ?? 0) + 1;
      counter.set(c.module_id, n);
      rank.set(c.id, n);
    }
    for (const m of byModule.values()) {
      m.sessions = m.sessions
        .sort((a, b) => (rank.get(a.courseId) ?? 0) - (rank.get(b.courseId) ?? 0))
        .map((x) => ({ ...x, label: `Séance ${rank.get(x.courseId) ?? "?"} · ${x.label}` }));
    }
  }
  return [...byModule.values()].sort(
    (a, b) => b.year - a.year || a.name.localeCompare(b.name, "fr"),
  );
}
