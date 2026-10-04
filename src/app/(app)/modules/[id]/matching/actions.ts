"use server";

import { revalidatePath } from "next/cache";

import { retainResource, unretainResource } from "@/app/(app)/modules/[id]/retained/actions";
import { getExpectationLinks } from "@/lib/modules/expectation-links";
import { isWholeCourse, proposeAutoLinks } from "@/lib/modules/matching";
import { listCandidateResources } from "@/lib/modules/matching-queries";
import { getModuleExpectations, getRetainedResources } from "@/lib/modules/queries";
import { isResourceKind, type ResourceKind, type ResourceStatus } from "@/lib/resources/kind";
import { searchResources, type SearchExcerpt } from "@/lib/resources/search";
import { failure, SESSION_EXPIRED } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/** Résultat d'un geste du rapprochement : dit ce qui s'est passé, ou pourquoi ça n'a pas marché. */
export interface MatchState {
  done?: string;
  error?: string;
}

const refresh = (moduleId: string) => {
  revalidatePath(`/modules/${moduleId}/matching`);
  revalidatePath(`/modules/${moduleId}`);
};

/** La table des liens attendu ↔ ressource n'existe pas encore (base pas mise à jour). */
const missingLinkTable = (error: { code?: string; message?: string } | null) =>
  !!error &&
  (error.code === "42P01" ||
    error.code === "PGRST205" ||
    /expectation_resource/.test(error.message ?? ""));

const LINKS_AFTER_UPDATE =
  "Le lien précis avec cet attendu sera disponible après la mise à jour de la base de données : en attendant, la ressource est seulement retenue pour le module.";

/** Crée le lien explicite attendu ↔ ressource ; `false` si la table n'existe pas encore. */
async function linkExpectation(
  moduleId: string,
  expectationId: string,
  resourceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expectation_resource")
    .upsert(
      { module_id: moduleId, expectation_id: expectationId, resource_id: resourceId },
      { onConflict: "expectation_id,resource_id", ignoreDuplicates: true },
    );
  if (missingLinkTable(error)) return { ok: false };
  if (error) return { ok: false, error: failure("enregistrer") };
  return { ok: true };
}

/**
 * « Associer à cet attendu » : la ressource est liée à CET attendu seulement, et retenue pour le
 * module (US-55). Les autres attendus ne sont pas touchés.
 */
export async function associateForExpectation(
  moduleId: string,
  expectationId: string,
  resourceId: string,
): Promise<MatchState> {
  const supabase = await createClient();
  const { data: expectation } = await supabase
    .from("module_expectation")
    .select("id, module_id")
    .eq("id", expectationId)
    .maybeSingle();
  if (!expectation || expectation.module_id !== moduleId) {
    return { error: "Cet attendu n’existe plus." };
  }
  const result = await retainResource(moduleId, resourceId);
  if (result.error) return { error: result.error };
  const link = await linkExpectation(moduleId, expectationId, resourceId);
  if (link.error) return { error: link.error };
  refresh(moduleId);
  return { done: link.ok ? "Ressource associée à cet attendu." : LINKS_AFTER_UPDATE };
}

/**
 * « Retirer » : supprime le lien de CET attendu. La ressource reste retenue pour le module (elle
 * peut servir ailleurs) ; « Retirer du module » la retire vraiment.
 */
export async function unlinkFromExpectation(
  moduleId: string,
  expectationId: string,
  resourceId: string,
): Promise<MatchState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expectation_resource")
    .delete()
    .eq("module_id", moduleId)
    .eq("expectation_id", expectationId)
    .eq("resource_id", resourceId);
  if (missingLinkTable(error)) {
    // Ancien comportement : sans les liens, retirer = ne plus retenir pour le module.
    await unretainResource(moduleId, resourceId);
    refresh(moduleId);
    return { done: "Ressource retirée du module." };
  }
  if (error) return { error: failure("retirer") };
  refresh(moduleId);
  return {
    done: "Ressource retirée de cet attendu. Elle reste retenue pour le module : « Retirer du module » la retire vraiment.",
  };
}

/** « Retirer du module » : la ressource n'est plus retenue, ni liée à aucun attendu du module. */
export async function unretainForModule(moduleId: string, resourceId: string): Promise<MatchState> {
  const supabase = await createClient();
  await supabase
    .from("expectation_resource")
    .delete()
    .eq("module_id", moduleId)
    .eq("resource_id", resourceId);
  await unretainResource(moduleId, resourceId);
  refresh(moduleId);
  return { done: "Ressource retirée du module." };
}

/**
 * « Reprendre le rapprochement automatique » : pour chaque attendu sans lien, lie la meilleure
 * ressource déjà retenue pour le module (les mêmes propositions que l'aperçu).
 */
export async function applyAutoLinks(moduleId: string): Promise<MatchState & { count?: number }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };
  const [expectations, retained, candidates, links] = await Promise.all([
    getModuleExpectations(moduleId),
    getRetainedResources(moduleId),
    listCandidateResources(),
    getExpectationLinks(moduleId),
  ]);
  if (!links.available) return { error: LINKS_AFTER_UPDATE };
  const retainedIds = new Set(retained.map((r) => r.id));
  const proposals = proposeAutoLinks(
    expectations,
    candidates.filter((c) => retainedIds.has(c.id)),
    links.byExpectation,
  );
  if (proposals.length === 0) return { done: "Rien à reprendre.", count: 0 };
  const { error } = await supabase.from("expectation_resource").upsert(
    proposals.map((p) => ({
      module_id: moduleId,
      expectation_id: p.expectationId,
      resource_id: p.resourceId,
    })),
    { onConflict: "expectation_id,resource_id", ignoreDuplicates: true },
  );
  if (error) return { error: failure("enregistrer") };
  refresh(moduleId);
  return {
    done: `${proposals.length} attendu${proposals.length > 1 ? "s" : ""} rapproché${proposals.length > 1 ? "s" : ""}.`,
    count: proposals.length,
  };
}

/**
 * « Créer et retenir » : crée une ressource « à construire » d'après l'attendu (titre proposé = attendu,
 * modifiable, note d'intention) et la retient pour le module (US-57 + US-55).
 */
export async function buildForExpectation(
  moduleId: string,
  expectationId: string,
  _prev: MatchState,
  formData?: FormData,
): Promise<MatchState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: SESSION_EXPIRED };

  const { data: expectation } = await supabase
    .from("module_expectation")
    .select("label, module_id")
    .eq("id", expectationId)
    .maybeSingle();
  if (!expectation || expectation.module_id !== moduleId) {
    return { error: "Cet attendu n’existe plus." };
  }

  const typed = String(formData?.get("title") ?? "").trim();
  const wanted = typed || expectation.label;
  const title = wanted.length > 200 ? `${wanted.slice(0, 199)}…` : wanted;
  const { data: resource } = await supabase
    .from("resource")
    .insert({
      title,
      status: "progress",
      intent_note: `Attendu de l'école : ${expectation.label}`.slice(0, 2000),
    })
    .select("id")
    .single();
  if (!resource) return { error: failure("créer la ressource") };

  const retained = await retainResource(moduleId, resource.id);
  if (retained.error) return { error: retained.error };
  const link = await linkExpectation(moduleId, expectationId, resource.id);
  if (link.error) return { error: link.error };
  revalidatePath("/resources");
  refresh(moduleId);
  return { done: "Ressource à construire créée et retenue." };
}

/** Séances qui couvrent un attendu : remplace les liens par la sélection reçue. */
export async function setExpectationCourses(
  moduleId: string,
  expectationId: string,
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;

  const [{ data: expectation }, { data: courses }] = await Promise.all([
    supabase
      .from("module_expectation")
      .select("id, module_id")
      .eq("id", expectationId)
      .maybeSingle(),
    supabase.from("course").select("id").eq("module_id", moduleId),
  ]);
  if (!expectation || expectation.module_id !== moduleId) return;

  // Seules les séances de ce module sont acceptées.
  const allowed = new Set((courses ?? []).map((c) => c.id));
  const wanted = formData
    .getAll("courseIds")
    .map(String)
    .filter((id) => allowed.has(id));

  await supabase
    .from("course_expectation")
    .delete()
    .eq("expectation_id", expectationId)
    .in("course_id", [...allowed]);
  if (wanted.length) {
    await supabase
      .from("course_expectation")
      .insert(wanted.map((course_id) => ({ course_id, expectation_id: expectationId })));
  }
  refresh(moduleId);
}

export async function dismissMatch(
  moduleId: string,
  expectationId: string,
  resourceId: string,
): Promise<MatchState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expectation_dismissal")
    .upsert(
      { module_id: moduleId, expectation_id: expectationId, resource_id: resourceId },
      { onConflict: "module_id,expectation_id,resource_id" },
    );
  if (error) {
    return { error: "Cette fonction sera disponible après la mise à jour de la base de données." };
  }
  refresh(moduleId);
  return { done: "Ressource écartée pour cet attendu." };
}

export interface LibraryHit {
  id: string;
  title: string;
  kind: ResourceKind | null;
  status: ResourceStatus;
  tags: string[];
  /** Cours entier découpé en briques par ailleurs. */
  wholeCourse: boolean;
  excerpt: SearchExcerpt | null;
  /** Autres attendus de ce module auxquels la ressource est déjà associée. */
  alsoFor: string[];
}

export interface LibraryPage {
  total: number;
  page: number;
  pageCount: number;
  hits: LibraryHit[];
}

const LIBRARY_PAGE_SIZE = 10;

/**
 * Recherche dans TOUTE la bibliothèque (titre, tags, matière, description et contenu, sans accent
 * ni casse) pour associer à un attendu une ressource que la correspondance par mots n'a pas
 * proposée. Le contenu reste côté serveur ; résultats paginés, briques avant cours complets.
 */
export async function searchLibraryForExpectation(
  moduleId: string,
  expectationId: string,
  input: { q: string; kind: string; category: string; page: number },
): Promise<LibraryPage> {
  const q = input.q.trim().slice(0, 100);
  const empty: LibraryPage = { total: 0, page: 1, pageCount: 1, hits: [] };
  const kind = isResourceKind(input.kind) ? input.kind : null;
  const category = input.category.trim();
  if (q.length < 2 && !kind && !category) return empty;

  const supabase = await createClient();
  let query = supabase
    .from("resource")
    .select("id, title, description, tags, content, kind, status, category")
    .is("archived_at", null);
  if (kind) query = query.eq("kind", kind);
  if (category) query = query.eq("category", category);
  const [{ data }, links, expectations] = await Promise.all([
    query,
    getExpectationLinks(moduleId),
    getModuleExpectations(moduleId),
  ]);

  const searchable = (data ?? []).map((r) => ({
    ...r,
    // La matière se cherche comme un tag.
    tags: [...(r.tags ?? []), ...(r.category ? [r.category] : [])],
  }));
  const found = searchResources(searchable, q.length >= 2 ? q : "").sort(
    (a, b) =>
      Number(isWholeCourse(a.resource)) - Number(isWholeCourse(b.resource)) ||
      a.resource.title.localeCompare(b.resource.title, "fr"),
  );

  const labels = new Map(expectations.map((e) => [e.id, e.label]));
  const pageCount = Math.max(1, Math.ceil(found.length / LIBRARY_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(input.page) || 1), pageCount);
  const hits = found
    .slice((page - 1) * LIBRARY_PAGE_SIZE, page * LIBRARY_PAGE_SIZE)
    .map(({ resource, excerpt }) => ({
      id: resource.id,
      title: resource.title,
      kind: resource.kind,
      status: resource.status,
      tags: (resource.tags ?? []).slice(0, 4),
      wholeCourse: isWholeCourse(resource),
      excerpt,
      alsoFor: [...links.byExpectation]
        .filter(([id, set]) => id !== expectationId && set.has(resource.id))
        .flatMap(([id]) => labels.get(id) ?? []),
    }));
  return { total: found.length, page, pageCount, hits };
}
