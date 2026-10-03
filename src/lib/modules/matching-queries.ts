import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

import type { MatchableResource } from "./matching";

export interface CandidateResource extends MatchableResource {
  kind: Tables<"resource">["kind"];
  status: Tables<"resource">["status"];
  /** Modules où la ressource sert déjà (séances liées) ou est retenue. */
  moduleNames: string[];
}

/** Ressources actives avec le nom des modules où elles servent déjà (US-54). */
export async function listCandidateResources(): Promise<CandidateResource[]> {
  const supabase = await createClient();
  const [{ data: resources }, { data: linked }, { data: retained }] = await Promise.all([
    supabase
      .from("resource")
      .select("id, title, description, tags, content, kind, status")
      .is("archived_at", null)
      // Les plus récentes d'abord : si la liste dépasse la limite de lignes de l'API, ce sont les
      // ressources les plus anciennes qui sont laissées de côté, jamais celle qu'on vient de créer.
      .order("created_at", { ascending: false }),
    supabase
      .from("course_resource")
      .select("resource_id, course:course_id(module:module_id(name))"),
    supabase.from("module_resource").select("resource_id, module:module_id(name)"),
  ]);

  const names = new Map<string, Set<string>>();
  const add = (resourceId: string, name: string | undefined) => {
    if (!name) return;
    const set = names.get(resourceId) ?? new Set<string>();
    set.add(name);
    names.set(resourceId, set);
  };
  for (const row of (linked ?? []) as unknown as {
    resource_id: string;
    course: { module: { name: string } | null } | null;
  }[]) {
    add(row.resource_id, row.course?.module?.name);
  }
  for (const row of (retained ?? []) as unknown as {
    resource_id: string;
    module: { name: string } | null;
  }[]) {
    add(row.resource_id, row.module?.name);
  }

  return (resources ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    tags: r.tags ?? [],
    content: r.content,
    kind: r.kind,
    status: r.status,
    moduleNames: [...(names.get(r.id) ?? [])].sort((a, b) => a.localeCompare(b, "fr")),
  }));
}

/** Séances du module couvrant chaque attendu : expectation_id → course_id[]. */
export async function getExpectationCourses(moduleId: string): Promise<Map<string, string[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_expectation")
    .select("expectation_id, course_id, course:course_id!inner(module_id)")
    .eq("course.module_id", moduleId);

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    map.set(row.expectation_id, [...(map.get(row.expectation_id) ?? []), row.course_id]);
  }
  return map;
}
