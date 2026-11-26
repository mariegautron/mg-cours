import "server-only";

import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { PublishableRow } from "./publication";

/** Côté enseignante (RLS). `null` : la base n'est pas encore à jour. */
export async function listPublicationRows(moduleId: string): Promise<PublishableRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appreciation")
    .select("student_id, text, is_proposal, published_text")
    .eq("module_id", moduleId);
  return error ? null : (data ?? []);
}

/** Appréciation publiée d'une personne, pour l'aperçu côté enseignante (RLS). */
export async function publishedAppreciation(
  moduleId: string,
  studentId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appreciation")
    .select("published_text")
    .eq("module_id", moduleId)
    .eq("student_id", studentId)
    .maybeSingle();
  return data?.published_text ?? null;
}

/**
 * Appréciation publiée de la personne d'un lien d'espace actif. Seul le texte publié sort d'ici :
 * jamais le texte de travail. À n'appeler qu'après validation du lien par `callStudentView`.
 */
export async function publishedAppreciationForToken(token: string): Promise<string | null> {
  if (!isWellFormedToken(token)) return null;
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("module_student_link")
    .select("module_id, student_id")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (!link) return null;
  const { data } = await admin
    .from("appreciation")
    .select("published_text")
    .eq("module_id", link.module_id)
    .eq("student_id", link.student_id)
    .maybeSingle();
  return data?.published_text ?? null;
}
