import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export interface ResourceListFilters {
  q?: string;
  category?: string;
  tag?: string;
  archived?: boolean;
}

export interface ResourceWithUsage extends Tables<"resource"> {
  /** Nombre de modules distincts où la ressource est utilisée. */
  moduleCount: number;
}

/** Nombre de modules distincts par ressource, via course_resource → course. */
async function moduleUsage(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_resource")
    .select("resource_id, course:course_id(module_id)");

  const byResource = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const moduleId = (row.course as { module_id: string } | null)?.module_id;
    if (!moduleId) continue;
    const set = byResource.get(row.resource_id) ?? new Set<string>();
    set.add(moduleId);
    byResource.set(row.resource_id, set);
  }
  return new Map(Array.from(byResource, ([id, set]) => [id, set.size]));
}

export async function listResources(
  filters: ResourceListFilters = {},
): Promise<ResourceWithUsage[]> {
  const supabase = await createClient();
  let query = supabase.from("resource").select("*").order("updated_at", { ascending: false });

  if (!filters.archived) query = query.is("archived_at", null);
  if (filters.q) {
    const like = `%${filters.q}%`;
    query = query.or(`title.ilike.${like},description.ilike.${like}`);
  }
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.tag) query = query.contains("tags", [filters.tag]);

  const [{ data }, usage] = await Promise.all([query, moduleUsage()]);
  return (data ?? []).map((r) => ({ ...r, moduleCount: usage.get(r.id) ?? 0 }));
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
