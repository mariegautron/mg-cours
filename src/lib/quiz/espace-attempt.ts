import "server-only";

import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * QCM publié et ouvert du module d'un lien d'espace, lu en direct (sans attendre « Mettre à jour
 * les cours publiés ») : titre et fermeture seulement, jamais les questions. Plus copie rendue.
 */
export async function liveQuizForToken(
  token: string,
): Promise<{ title: string; closesAt: string | null; submittedAt: string | null } | null> {
  if (!isWellFormedToken(token)) return null;
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("module_student_link")
    .select("module_id, student_id")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (!link) return null;
  const { data: quizzes } = await admin
    .from("quiz")
    .select("id, title, closes_at, assessment!inner(id, module_id, makeup_of_id)")
    .eq("assessment.module_id", link.module_id)
    .eq("status", "published");
  const open = (quizzes ?? []).find(
    (q) => !q.closes_at || new Date(q.closes_at).getTime() > Date.now(),
  );
  if (!open) return null;
  // Copie rendue sur ce QCM ou sur un QCM de la même famille (principal ou rattrapage) :
  // une personne qui a passé le rattrapage n'est plus invitée à passer le QCM principal.
  const a = open.assessment as unknown as { id: string; makeup_of_id: string | null };
  const root = a.makeup_of_id ?? a.id;
  const { data: atts } = await admin
    .from("quiz_attempt")
    .select("submitted_at, quiz!inner(assessment!inner(id, makeup_of_id))")
    .eq("student_id", link.student_id)
    .eq("status", "submitted")
    .is("revoked_at", null)
    .order("submitted_at", { ascending: false });
  const same = (atts ?? []).find((t) => {
    const x = (t.quiz as unknown as { assessment: { id: string; makeup_of_id: string | null } })
      .assessment;
    return x.id === root || x.makeup_of_id === root;
  });
  return { title: open.title, closesAt: open.closes_at, submittedAt: same?.submitted_at ?? null };
}

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
