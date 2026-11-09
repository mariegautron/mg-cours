"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { copyAssessmentFiles } from "@/lib/assessments/copy-files";
import { redrawQuizForMakeup } from "@/lib/assessments/makeup-draw";
import {
  excusedStudentIds,
  makeupBlocker,
  missingTargets,
  planMakeup,
} from "@/lib/assessments/makeup";
import { parseResourceFiles } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";

export interface MakeupState {
  error?: string;
}

/**
 * Prépare le rattrapage d'une évaluation individuelle pour les absent·es excusé·es (US-96). Un seul
 * rattrapage par évaluation : s'il existe déjà, les absent·es excusé·es pas encore inscrit·es le
 * rejoignent. Le sujet est copié (fichiers compris) en brouillon « à construire ».
 */
async function createMakeup(
  moduleId: string,
  originalId: string,
  options: { inAdvance?: boolean },
): Promise<MakeupState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Ta session a expiré : reconnecte-toi puis réessaie." };

  const { data: original } = await supabase
    .from("assessment")
    .select("*")
    .eq("id", originalId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!original) return { error: "Cette évaluation n’existe plus." };

  const { data: grades } = await supabase
    .from("grade")
    .select("student_id, attendance")
    .eq("assessment_id", originalId);
  const excused = excusedStudentIds(grades ?? []);
  // Préparé d'avance (US-144) : personne n'est encore absent·e, le sujet attend d'être utile.
  const blocker = makeupBlocker(original, options.inAdvance ? 1 : excused.length);
  if (blocker) return { error: blocker };

  const { data: existing } = await supabase
    .from("assessment")
    .select("id")
    .eq("makeup_of_id", originalId)
    .maybeSingle();

  let makeupId = existing?.id ?? null;
  if (!makeupId) {
    const { data: created, error } = await supabase
      .from("assessment")
      .insert(planMakeup(original))
      .select("id")
      .single();
    if (error || !created) {
      return { error: `Le rattrapage n’a pas pu être créé : ${error?.message ?? "réponse vide"}.` };
    }
    makeupId = created.id;

    // Seulement les groupes des personnes à rattraper (pas tous les groupes de l'original).
    const { data: originalGroups } = await supabase
      .from("assessment_group")
      .select("student_group_id")
      .eq("assessment_id", originalId);
    const { data: memberships } = excused.length
      ? await supabase
          .from("group_member")
          .select("student_group_id")
          .in("student_id", excused)
          .in(
            "student_group_id",
            (originalGroups ?? []).map((g) => g.student_group_id),
          )
      : { data: [] as { student_group_id: string }[] };
    const wanted = new Set((memberships ?? []).map((m) => m.student_group_id));
    const groups = (originalGroups ?? []).filter((g) => wanted.has(g.student_group_id));
    if (groups?.length) {
      const { error: groupError } = await supabase
        .from("assessment_group")
        .insert(
          groups.map((g) => ({ assessment_id: makeupId!, student_group_id: g.student_group_id })),
        );
      if (groupError) {
        await supabase.from("assessment").delete().eq("id", makeupId);
        return {
          error: `Les groupes du rattrapage n’ont pas pu être copiés : ${groupError.message}.`,
        };
      }
    }

    const { copied } = await copyAssessmentFiles(
      supabase,
      auth.user.id,
      parseResourceFiles(original.files),
      makeupId,
    );
    if (copied.length)
      await supabase.from("assessment").update({ files: copied }).eq("id", makeupId);
  }

  const { data: enrolled } = await supabase
    .from("assessment_student")
    .select("student_id")
    .eq("assessment_id", makeupId);
  const toAdd = missingTargets(
    excused,
    (enrolled ?? []).map((e) => e.student_id),
  );
  if (toAdd.length) {
    const { error } = await supabase
      .from("assessment_student")
      .insert(toAdd.map((student_id) => ({ assessment_id: makeupId!, student_id })));
    if (error) {
      if (!existing) await supabase.from("assessment").delete().eq("id", makeupId);
      return { error: `Les absent·es excusé·es n’ont pas pu être inscrit·es : ${error.message}.` };
    }
  }

  // QCM d'origine : le rattrapage reçoit son propre QCM (nouveau tirage, questions déjà vues évitées).
  const quiz = await redrawQuizForMakeup({ originalId, makeupId, studentIds: toAdd });

  revalidatePath(`/modules/${moduleId}/assessments`);
  revalidatePath(`/modules/${moduleId}/assessments/${originalId}`);
  revalidatePath(`/modules/${moduleId}/rattrapages`);
  // Retour sur la page Rattrapages : « Rattrapage créé », avec « Modifier le sujet » et « Donner le lien ».
  redirect(`/modules/${moduleId}/rattrapages?cree=${makeupId}${quiz.quiz ? "&qcm=1" : ""}`);
}

export async function prepareMakeup(moduleId: string, originalId: string): Promise<MakeupState> {
  return createMakeup(moduleId, originalId, {});
}

/** Sujet de rattrapage préparé dès la création de l'évaluation (US-144), sans absent·e excusé·e. */
export async function prepareMakeupInAdvance(
  moduleId: string,
  originalId: string,
): Promise<MakeupState> {
  return createMakeup(moduleId, originalId, { inAdvance: true });
}

/** Date (et heure de passage facultative) d'un rattrapage, depuis la page Rattrapages. */
export async function setMakeupDate(
  moduleId: string,
  makeupId: string,
  date: string,
): Promise<{ error?: string }> {
  const value = date.trim();
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: "Date invalide." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment")
    .update({ date: value || null })
    .eq("id", makeupId)
    .eq("module_id", moduleId)
    .not("makeup_of_id", "is", null);
  if (error) return { error: "La date n’a pas pu être enregistrée." };
  revalidatePath(`/modules/${moduleId}/rattrapages`);
  revalidatePath(`/modules/${moduleId}/assessments`);
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath("/dashboard");
  return {};
}
