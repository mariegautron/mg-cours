import { orderResources } from "@/lib/modules/session-builder";
import {
  carriedFirst,
  parseCarryOver,
  resourceIdOfKey,
  restoreAt,
  withoutIds,
  type CarriedEntry,
  type CarryOver,
} from "@/lib/present/carry-over";
import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Déroulé affiché d'une séance : ses fiches, dans l'ordre du plan (puis principale d'abord). */
async function currentOrder(supabase: Supabase, courseId: string): Promise<string[]> {
  const [{ data: links }, { data: plan }] = await Promise.all([
    supabase.from("course_resource").select("resource_id, role").eq("course_id", courseId),
    supabase.from("course_plan").select("resource_order").eq("course_id", courseId).maybeSingle(),
  ]);
  const natural = [...(links ?? [])]
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1))
    .map((l) => ({ id: l.resource_id }));
  return orderResources(natural, plan?.resource_order).map((r) => r.id);
}

async function setOrder(supabase: Supabase, courseId: string, order: string[]) {
  const { data } = await supabase
    .from("course_plan")
    .select("deliverable")
    .eq("course_id", courseId)
    .maybeSingle();
  await supabase
    .from("course_plan")
    .upsert(
      { course_id: courseId, deliverable: data?.deliverable ?? "", resource_order: order },
      { onConflict: "course_id" },
    );
}

/** `null` si la colonne n'existe pas encore : le report n'a alors pas lieu (clôture inchangée). */
export async function loadCarryOver(
  supabase: Supabase,
  courseId: string,
): Promise<CarryOver | null> {
  const { data, error } = await supabase
    .from("course")
    .select("carried_over")
    .eq("id", courseId)
    .maybeSingle();
  if (error) return null;
  return parseCarryOver(data?.carried_over);
}

/** Défait un report : fiches remises dans la séance clôturée, retirées de la suivante si ajoutées. */
async function undoEntries(supabase: Supabase, courseId: string, entries: readonly CarriedEntry[]) {
  const moved = [...entries].filter((e) => !e.pending).sort((a, b) => a.orderIndex - b.orderIndex);
  if (moved.length === 0) return;

  for (const e of moved) {
    const { data: there } = await supabase
      .from("course_resource")
      .select("resource_id")
      .eq("course_id", courseId)
      .eq("resource_id", e.resourceId)
      .maybeSingle();
    if (!there) {
      await supabase.from("course_resource").insert({
        course_id: courseId,
        resource_id: e.resourceId,
        role: e.link.role,
        activity_type: e.link.activity_type,
        duration_minutes: e.link.duration_minutes,
        pedagogical_objective: e.link.pedagogical_objective,
      });
    }
  }
  let order = await currentOrder(supabase, courseId);
  for (const e of moved) order = restoreAt(order, e.resourceId, e.orderIndex);
  await setOrder(supabase, courseId, order);

  const byTarget = new Map<string, string[]>();
  for (const e of moved) {
    if (e.added && e.toCourseId) {
      byTarget.set(e.toCourseId, [...(byTarget.get(e.toCourseId) ?? []), e.resourceId]);
    }
  }
  for (const [target, ids] of byTarget) {
    await supabase.from("course_resource").delete().eq("course_id", target).in("resource_id", ids);
    await setOrder(supabase, target, withoutIds(await currentOrder(supabase, target), ids));
  }
}

async function saveCarryOver(supabase: Supabase, courseId: string, value: CarryOver) {
  await supabase
    .from("course")
    .update({
      carried_over: (value.carried.length || value.skipped.length
        ? value
        : null) as unknown as Json,
    })
    .eq("id", courseId);
}

/**
 * Applique la clôture : annule d'abord un éventuel report précédent (« Modifier la clôture » ne
 * crée jamais de doublon), puis déplace chaque fiche « à reporter » vers la séance suivante, en
 * tête du déroulé. Sans séance suivante, le report reste en attente. Tolérant : une erreur ne
 * doit jamais empêcher la clôture.
 */
export async function applyCarryOver(
  supabase: Supabase,
  moduleId: string,
  courseId: string,
  carry: { key: string; title: string }[],
  skipped: { key: string; title: string }[],
): Promise<void> {
  try {
    const before = await loadCarryOver(supabase, courseId);
    if (!before) return;
    await undoEntries(supabase, courseId, before.carried);

    const { data: courses } = await supabase
      .from("course")
      .select("id")
      .eq("module_id", moduleId)
      .order("position")
      .order("created_at");
    const list = courses ?? [];
    const next = list[list.findIndex((c) => c.id === courseId) + 1] ?? null;

    const closedOrder = await currentOrder(supabase, courseId);
    const entries: CarriedEntry[] = [];
    for (const item of carry) {
      const resourceId = resourceIdOfKey(item.key);
      if (!resourceId) continue;
      const { data: link } = await supabase
        .from("course_resource")
        .select("role, activity_type, duration_minutes, pedagogical_objective")
        .eq("course_id", courseId)
        .eq("resource_id", resourceId)
        .maybeSingle();
      if (!link) continue;
      entries.push({
        key: item.key,
        resourceId,
        title: item.title,
        toCourseId: next?.id ?? null,
        pending: !next,
        added: false,
        link,
        orderIndex: Math.max(0, closedOrder.indexOf(resourceId)),
      });
    }

    if (next) {
      const nextBefore = await currentOrder(supabase, next.id);
      const addedIds: string[] = [];
      for (const e of entries) {
        if (!nextBefore.includes(e.resourceId)) {
          const { error } = await supabase.from("course_resource").insert({
            course_id: next.id,
            resource_id: e.resourceId,
            role: "secondary",
            activity_type: e.link.activity_type,
            duration_minutes: e.link.duration_minutes,
            pedagogical_objective: e.link.pedagogical_objective,
          });
          if (!error) {
            e.added = true;
            addedIds.push(e.resourceId);
          }
        }
      }
      await supabase
        .from("course_resource")
        .delete()
        .eq("course_id", courseId)
        .in(
          "resource_id",
          entries.map((e) => e.resourceId),
        );
      if (addedIds.length) {
        await setOrder(
          supabase,
          next.id,
          carriedFirst(await currentOrder(supabase, next.id), addedIds),
        );
      }
      if (entries.length) {
        await setOrder(
          supabase,
          courseId,
          withoutIds(
            closedOrder,
            entries.map((e) => e.resourceId),
          ),
        );
      }
    }

    await saveCarryOver(supabase, courseId, { carried: entries, skipped });
  } catch {
    // Au mieux : la clôture est déjà enregistrée.
  }
}

/** Annule le report d'une séance clôturée : tout revient comme avant la clôture. */
export async function undoCarryOver(supabase: Supabase, courseId: string): Promise<void> {
  try {
    const state = await loadCarryOver(supabase, courseId);
    if (!state) return;
    await undoEntries(supabase, courseId, state.carried);
    await saveCarryOver(supabase, courseId, { carried: [], skipped: state.skipped });
  } catch {
    // Ignoré.
  }
}
