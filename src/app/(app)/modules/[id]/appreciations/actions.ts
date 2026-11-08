"use server";

import { revalidatePath } from "next/cache";

import { draftAppreciation, type Draft, type DraftBasis } from "@/lib/appreciations/draft";
import { getAppreciationBasis } from "@/lib/appreciations/basis-queries";
import { cleanAppreciation } from "@/lib/appreciations/appreciation";
import { failure } from "@/lib/messages";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { createClient } from "@/lib/supabase/server";

export interface AppreciationState {
  error?: string;
  savedAt?: string;
}

/**
 * Enregistre (ou efface) l'appréciation d'un·e étudiant·e pour un module (US-149a). Texte écrit à
 * la main : rien n'est généré. Le brouillon est toujours enregistré, même trop long : seule la copie vers Hyperplanning est bloquée.
 */
export async function saveAppreciation(
  moduleId: string,
  studentId: string,
  text: string,
  proposal = false,
): Promise<AppreciationState> {
  const cleaned = cleanAppreciation(text);

  const supabase = await createClient();
  if (cleaned === "") {
    const { error } = await supabase
      .from("appreciation")
      .delete()
      .eq("module_id", moduleId)
      .eq("student_id", studentId);
    if (error) return { error: failure("enregistrer", { kept: true }) };
  } else {
    const { error } = await supabase
      .from("appreciation")
      .upsert(
        { module_id: moduleId, student_id: studentId, text: cleaned },
        { onConflict: "module_id,student_id" },
      );
    if (error) return { error: failure("enregistrer", { kept: true }) };
  }
  // « Proposé, à relire » : au mieux, sans bloquer si la colonne n'existe pas encore.
  await supabase
    .from("appreciation")
    .update({ is_proposal: proposal && cleaned !== "" })
    .eq("module_id", moduleId)
    .eq("student_id", studentId);
  return {
    savedAt: new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }),
  };
}

/** Coche ou décoche « Reportée dans Hyperplanning » : mémorise le texte reporté pour repérer les modifications ensuite. */
export async function setReported(
  moduleId: string,
  studentId: string,
  reported: boolean,
): Promise<AppreciationState> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("appreciation")
    .select("text")
    .eq("module_id", moduleId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!row) return { error: "Écris d’abord l’appréciation." };
  const { error } = await supabase
    .from("appreciation")
    .update({ reported_text: reported ? row.text : null })
    .eq("module_id", moduleId)
    .eq("student_id", studentId);
  if (error) return { error: failure("enregistrer", { kept: true }) };
  revalidatePath(`/modules/${moduleId}/appreciations`);
  return {};
}

export interface DraftResult extends AppreciationState {
  text?: string;
  basis?: DraftBasis;
}

async function buildDraft(
  moduleId: string,
  studentId: string,
  max: number,
  used: Set<string>,
): Promise<Draft> {
  const basis = await getAppreciationBasis(moduleId, studentId);
  return draftAppreciation(
    {
      seed: studentId,
      ownTags: basis.observations.map((o) => o.tag),
      groupTags: (basis.group?.observations ?? []).map((o) => o.tag),
      hasStrengthsComment: basis.comments.some((c) => c.strengths),
      hasProgressComment: basis.comments.some((c) => c.progress),
      max,
    },
    used,
  );
}

/** Propose un brouillon pour une personne (gabarit, rien ne sort de l'appli). Ne l'enregistre pas. */
export async function proposeDraft(moduleId: string, studentId: string): Promise<DraftResult> {
  const { appreciationMax } = await getSchoolRulesForModule(moduleId);
  const draft = await buildDraft(moduleId, studentId, appreciationMax, new Set());
  return { text: draft.text, basis: draft.basis };
}

/** Propose un brouillon pour chaque personne « À écrire » (jamais une appréciation déjà écrite), sans phrase en double. */
export async function proposeAllDrafts(
  moduleId: string,
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient();
  const { appreciationMax } = await getSchoolRulesForModule(moduleId);
  const [{ data: members }, { data: rows }] = await Promise.all([
    supabase
      .from("group_member")
      .select("student_id, student_group!inner(module_id)")
      .eq("student_group.module_id", moduleId),
    supabase.from("appreciation").select("student_id, text").eq("module_id", moduleId),
  ]);
  const written = new Set(
    (rows ?? []).filter((r) => r.text.trim() !== "").map((r) => r.student_id),
  );
  const todo = [...new Set((members ?? []).map((m) => m.student_id))].filter(
    (id) => !written.has(id),
  );
  // `used` mémorise les phrases employées dans ce lot : pas de phrase en double d'une personne à l'autre.
  const used = new Set<string>();
  let count = 0;
  for (const studentId of todo) {
    const draft = await buildDraft(moduleId, studentId, appreciationMax, used);
    const result = await saveAppreciation(moduleId, studentId, draft.text, true);
    if (result.error) return { count, error: result.error };
    count++;
  }
  revalidatePath(`/modules/${moduleId}/appreciations`);
  return { count };
}

/** « Valider » : le brouillon relu devient une appréciation écrite. */
export async function validateProposal(
  moduleId: string,
  studentId: string,
): Promise<AppreciationState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("appreciation")
    .update({ is_proposal: false })
    .eq("module_id", moduleId)
    .eq("student_id", studentId);
  if (error) return { error: failure("enregistrer", { kept: true }) };
  revalidatePath(`/modules/${moduleId}/appreciations`);
  return {};
}
