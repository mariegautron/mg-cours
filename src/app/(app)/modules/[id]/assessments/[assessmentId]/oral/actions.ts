"use server";

import { revalidatePath } from "next/cache";

import { moveSlot, orderOral, parseClock } from "@/lib/assessments/oral";
import { createClient } from "@/lib/supabase/server";

export interface OralState {
  error?: string;
  message?: string;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

function refresh(moduleId: string, assessmentId: string) {
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}/oral`);
}

/** Groupes visés par l'évaluation (l'ordre de passage ne concerne qu'eux). */
async function assessmentGroupIds(supabase: Supabase, assessmentId: string) {
  const { data } = await supabase
    .from("assessment_group")
    .select("student_group_id")
    .eq("assessment_id", assessmentId);
  return (data ?? []).map((r) => r.student_group_id);
}

/**
 * Établit l'ordre de passage : `rank-<groupe>` (1, 2, 3…) désigne les volontaires dans l'ordre voulu ;
 * les autres groupes sont tirés au sort avec une graine conservée. Refaire un ordre existant demande
 * le champ `confirm=1` (posé par le dialogue de confirmation) : le serveur refuse sinon.
 */
export async function buildOralOrder(
  moduleId: string,
  assessmentId: string,
  _prev: OralState,
  formData: FormData,
): Promise<OralState> {
  const confirm = formData.get("confirm") === "1";
  const supabase = await createClient();
  const groupIds = await assessmentGroupIds(supabase, assessmentId);
  if (groupIds.length === 0) return { error: "Aucun groupe n’est visé par cette évaluation." };

  const { count } = await supabase
    .from("oral_slot")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", assessmentId);
  if ((count ?? 0) > 0 && !confirm) {
    return { error: "Un ordre existe déjà : confirmez pour le refaire." };
  }

  const ranks = groupIds
    .map((id) => ({ id, rank: Number(String(formData.get(`rank-${id}`) ?? "").trim()) }))
    .filter((r) => Number.isInteger(r.rank) && r.rank > 0);
  if (new Set(ranks.map((r) => r.rank)).size !== ranks.length) {
    return { error: "Deux volontaires ont le même rang : donnez à chacun un rang différent." };
  }
  const volunteers = ranks.sort((a, b) => a.rank - b.rank).map((r) => r.id);

  const seed = crypto.randomUUID().slice(0, 8);
  const order = orderOral({ groupIds, volunteers, seed });

  if ((count ?? 0) > 0) {
    const { error } = await supabase.from("oral_slot").delete().eq("assessment_id", assessmentId);
    if (error) return { error: "Enregistrement impossible." };
  }
  const { error } = await supabase.from("oral_slot").insert(
    order.map((o, i) => ({
      assessment_id: assessmentId,
      student_group_id: o.groupId,
      position: i + 1,
      order_method: o.method,
      order_seed: seed,
    })),
  );
  if (error) return { error: "Enregistrement impossible." };

  refresh(moduleId, assessmentId);
  return {
    message: `Ordre établi pour ${order.length} groupe${order.length > 1 ? "s" : ""} (graine ${seed}).`,
  };
}

/** Heure de début et durée par groupe de l'oral (les créneaux se déduisent de ces deux valeurs). */
export async function saveOralSettings(
  moduleId: string,
  assessmentId: string,
  _prev: OralState,
  formData: FormData,
): Promise<OralState> {
  const startRaw = String(formData.get("startTime") ?? "").trim();
  if (startRaw && parseClock(startRaw) === null) return { error: "Heure de début invalide." };
  const durationRaw = String(formData.get("durationMinutes") ?? "").trim();
  const duration = durationRaw ? Number(durationRaw) : null;
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 240)) {
    return { error: "La durée est un nombre de minutes entre 1 et 240." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment")
    .update({ oral_start_time: startRaw || null, duration_minutes: duration })
    .eq("id", assessmentId);
  if (error) return { error: "Enregistrement impossible." };

  refresh(moduleId, assessmentId);
  return { message: "Horaires enregistrés." };
}

/** Durée propre à un créneau ; `null` : durée de l'évaluation. */
export async function setSlotDuration(
  moduleId: string,
  assessmentId: string,
  slotId: string,
  minutes: number | null,
): Promise<OralState> {
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 240)) {
    return { error: "La durée est un nombre de minutes entre 1 et 240." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("oral_slot")
    .update({ duration_minutes: minutes })
    .eq("id", slotId)
    .eq("assessment_id", assessmentId);
  if (error) return { error: "Enregistrement impossible." };
  refresh(moduleId, assessmentId);
  return { message: "Durée enregistrée." };
}

/** Monte ou descend un créneau d'un rang (échange avec son voisin). */
export async function moveOralSlot(
  moduleId: string,
  assessmentId: string,
  slotId: string,
  direction: -1 | 1,
): Promise<OralState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("oral_slot")
    .select("id")
    .eq("assessment_id", assessmentId)
    .order("position");
  const before = data ?? [];
  const after = moveSlot(before, slotId, direction);
  if (after.every((s, i) => s.id === before[i]?.id)) return {};

  const results = await Promise.all(
    after.map((s, i) =>
      supabase
        .from("oral_slot")
        .update({ position: i + 1 })
        .eq("id", s.id),
    ),
  );
  if (results.some((r) => r.error)) return { error: "Enregistrement impossible." };
  refresh(moduleId, assessmentId);
  return { message: "Ordre modifié." };
}

/** Marque un groupe comme passé (« groupe suivant ») ou le remet en attente. */
export async function setSlotStatus(
  moduleId: string,
  assessmentId: string,
  slotId: string,
  status: "waiting" | "done",
): Promise<OralState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("oral_slot")
    .update({ status })
    .eq("id", slotId)
    .eq("assessment_id", assessmentId);
  if (error) return { error: "Enregistrement impossible." };
  refresh(moduleId, assessmentId);
  return {};
}
