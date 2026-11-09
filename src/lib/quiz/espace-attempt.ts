import "server-only";

import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Copie de QCM rendue par la personne d'un lien d'espace, dans ce module : date de remise, sinon
 * `null`. Seule la date sort d'ici (jamais de réponse ni de note).
 */
export async function quizSubmittedAtForToken(token: string): Promise<string | null> {
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
    .from("quiz_attempt")
    .select("submitted_at, quiz!inner(status, assessment!inner(module_id))")
    .eq("student_id", link.student_id)
    .eq("status", "submitted")
    .is("revoked_at", null)
    .eq("quiz.status", "published")
    .eq("quiz.assessment.module_id", link.module_id)
    .order("submitted_at", { ascending: false })
    .limit(1);
  return data?.[0]?.submitted_at ?? null;
}
