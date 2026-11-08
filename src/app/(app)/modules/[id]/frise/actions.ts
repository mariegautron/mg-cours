"use server";

import { revalidatePath } from "next/cache";

import { clientEnv } from "@/lib/env";
import { moduleShareUrl, publicSlidesUrl } from "@/lib/modules/frise";
import { DEFAULT_ESPACE_OPTIONS, type EspaceOptions } from "@/lib/modules/espace";
import { loadEspace } from "@/lib/modules/espace-queries";
import { loadFrise } from "@/lib/modules/frise-queries";
import {
  getAssessment,
  getGradesByAssessment,
  listModuleAssessments,
} from "@/lib/assessments/queries";
import { incompleteCopies } from "@/lib/assessments/incomplete";
import { publishResults } from "@/app/(app)/modules/[id]/assessments/results-links-actions";
import { listResultLinks } from "@/lib/result-links/queries";
import { failure, NOT_FOUND } from "@/lib/messages";
import { generateToken, hashToken } from "@/lib/quiz/token";
import { createClient } from "@/lib/supabase/server";

export interface ShareState {
  error?: string;
  /** Lien créé : le jeton n'est jamais relisible ensuite (seul le haché est gardé). */
  url?: string;
  revoked?: boolean;
  updated?: boolean;
  /** Notes poussées dans les espaces avec la mise à jour. */
  notes?: {
    published: number;
    /** Copies incomplètes : non publiées (l'ancienne note éventuelle reste visible tant qu'on ne la retire pas). */
    incomplete: {
      assessmentId: string;
      title: string;
      copy: string;
      students: { id: string; name: string }[];
      hasOldNote: boolean;
    }[];
  };
}

const UNAVAILABLE =
  "Le lien partageable sera disponible après la mise à jour de la base de données. La frise reste projetable.";

/** Crée (ou remplace) le lien de la frise : l'ancien lien est révoqué, l'instantané est celui d'aujourd'hui. */
async function snapshot(moduleId: string, options: EspaceOptions, quizUrl: string | null) {
  const frise = await loadFrise(moduleId);
  if (!frise) return null;
  const espace = await loadEspace(moduleId, options, publicSlidesUrl(quizUrl));
  return { ...frise, espace } as never;
}

/** Met à jour l'instantané du lien actif (même adresse) avec les données d'aujourd'hui. */
export async function updateModuleLink(
  moduleId: string,
  options: EspaceOptions = DEFAULT_ESPACE_OPTIONS,
  quizUrl: string | null = null,
): Promise<ShareState> {
  const supabase = await createClient();
  const payload = await snapshot(moduleId, options, quizUrl);
  if (!payload) return { error: NOT_FOUND.module };
  const { data, error } = await supabase
    .from("module_share_link")
    .update({ payload, published_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null)
    .select("id");
  if (error) return { error: failure("mettre à jour le lien") };
  if (!data?.length) return { error: "Aucun lien actif : crée-le d’abord." };
  revalidatePath(`/modules/${moduleId}/frise`);
  const notes = await publishModuleNotes(moduleId);
  if ("error" in notes) return { error: notes.error };
  return { updated: true, notes };
}

/**
 * Publie dans les espaces les notes des copies COMPLÈTES de toutes les évaluations du module, et
 * relève les copies incomplètes (non publiées) pour que Marie le sache au moment du clic.
 */
async function publishModuleNotes(
  moduleId: string,
): Promise<NonNullable<ShareState["notes"]> | { error: string }> {
  const out: NonNullable<ShareState["notes"]> = { published: 0, incomplete: [] };
  const assessments = (await listModuleAssessments(moduleId)).filter((a) => !a.makeup_of_id);
  for (const a of assessments) {
    const grades = await getGradesByAssessment(a.id);
    if (grades.length === 0) continue;
    const full = await getAssessment(a.id);
    const copies = incompleteCopies(grades, full?.groups ?? []);
    if (grades.some((g) => g.value !== null || g.attendance === "absent_excused")) {
      const res = await publishResults(moduleId, a.id);
      if (res.error && res.error !== "Aucune note à publier pour l’instant.") {
        return { error: res.error };
      }
      out.published += (res.created?.length ?? 0) + (res.refreshed ?? 0);
    }
    if (copies.length > 0) {
      const links = (await listResultLinks(a.id)).byStudent;
      for (const c of copies) {
        out.incomplete.push({
          assessmentId: a.id,
          title: a.title,
          copy: c.name,
          students: c.students,
          hasOldNote: c.students.some((s) => links.has(s.id)),
        });
      }
    }
  }
  return out;
}

export async function publishModuleLink(
  moduleId: string,
  options: EspaceOptions = DEFAULT_ESPACE_OPTIONS,
  quizUrl: string | null = null,
): Promise<ShareState> {
  const supabase = await createClient();
  const probe = await supabase.from("module_share_link").select("id").limit(1);
  if (probe.error) return { error: UNAVAILABLE };
  const payload = await snapshot(moduleId, options, quizUrl);
  if (!payload) return { error: NOT_FOUND.module };

  const revoke = await supabase
    .from("module_share_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  if (revoke.error) return { error: failure("créer le lien") };

  const token = generateToken();
  const { error } = await supabase.from("module_share_link").insert({
    module_id: moduleId,
    token_hash: hashToken(token),
    payload,
  });
  if (error) return { error: failure("créer le lien") };
  revalidatePath(`/modules/${moduleId}/frise`);
  return { url: moduleShareUrl(clientEnv.NEXT_PUBLIC_APP_URL, token) };
}

/** Révoque le lien : il n'affichera plus rien. */
export async function revokeModuleLink(moduleId: string): Promise<ShareState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("module_share_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  if (error) return { error: failure("révoquer le lien") };
  revalidatePath(`/modules/${moduleId}/frise`);
  return { revoked: true };
}

/** Passe le sujet d'une évaluation du module en « Prête » : il devient visible dans l'espace à la prochaine mise à jour. */
export async function markAssessmentReady(
  moduleId: string,
  assessmentId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment")
    .update({ prep_status: "ready" })
    .eq("id", assessmentId)
    .eq("module_id", moduleId);
  if (error) return { error: failure("changer le statut du sujet") };
  revalidatePath(`/modules/${moduleId}/frise`);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  return {};
}
