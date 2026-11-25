import "server-only";

import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LiveQuiz {
  title: string;
  closesAt: string | null;
  /** Excusé·e au QCM principal avec un rattrapage prévu : « Rattrapage prévu » au lieu de « ouvert ». */
  makeupPlanned?: boolean;
}

/**
 * QCM publié et ouvert qu'une personne a ENCORE à passer, lu en direct (sans attendre « Mettre à
 * jour les cours publiés ») : titre et fermeture seulement, jamais les questions. `null` si elle a
 * déjà rendu une copie ou a une note dans la famille (principal ou rattrapage), et pour un
 * rattrapage auquel elle n'est pas inscrite.
 */
export async function liveQuizForStudent(
  moduleId: string,
  studentId: string,
): Promise<LiveQuiz | null> {
  const admin = createAdminClient();
  const { data: quizzes } = await admin
    .from("quiz")
    .select("title, closes_at, assessment!inner(id, module_id, makeup_of_id)")
    .eq("assessment.module_id", moduleId)
    .eq("status", "published");
  type A = { id: string; makeup_of_id: string | null };
  const candidates = (quizzes ?? [])
    .filter((q) => !q.closes_at || new Date(q.closes_at).getTime() > Date.now())
    .map((q) => ({ ...q, a: q.assessment as unknown as A }))
    // Les rattrapages d'abord : une personne inscrite voit le sien, pas le QCM principal.
    .sort((x, y) => Number(!!y.a.makeup_of_id) - Number(!!x.a.makeup_of_id));
  if (candidates.length === 0) return null;

  const [{ data: family }, { data: atts }, { data: grades }, { data: enrolled }] =
    await Promise.all([
      admin.from("assessment").select("id, makeup_of_id").eq("module_id", moduleId),
      admin
        .from("quiz_attempt")
        .select("quiz!inner(assessment!inner(id))")
        .eq("student_id", studentId)
        .eq("status", "submitted")
        .is("revoked_at", null),
      admin.from("grade").select("assessment_id, value, attendance").eq("student_id", studentId),
      admin.from("assessment_student").select("assessment_id").eq("student_id", studentId),
    ]);
  const submitted = new Set(
    (atts ?? []).map((t) => (t.quiz as unknown as { assessment: { id: string } }).assessment.id),
  );
  const graded = new Set(
    (grades ?? []).filter((g) => g.value !== null).map((g) => g.assessment_id),
  );

  for (const q of candidates) {
    const root = q.a.makeup_of_id ?? q.a.id;
    const ids = (family ?? [])
      .filter((f) => f.id === root || f.makeup_of_id === root)
      .map((f) => f.id);
    if (ids.some((id) => submitted.has(id) || graded.has(id))) continue;
    const open = { title: q.title, closesAt: q.closes_at };
    if (q.a.makeup_of_id) {
      if ((enrolled ?? []).some((e) => e.assessment_id === q.a.id)) return open;
      continue;
    }
    const excused = (grades ?? []).some(
      (g) => g.assessment_id === q.a.id && g.attendance === "absent_excused",
    );
    return excused ? { ...open, makeupPlanned: true } : open;
  }
  return null;
}

/** Même lecture, à partir du jeton d'un lien d'espace. */
export async function liveQuizForToken(token: string): Promise<LiveQuiz | null> {
  if (!isWellFormedToken(token)) return null;
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("module_student_link")
    .select("module_id, student_id")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  return link ? liveQuizForStudent(link.module_id, link.student_id) : null;
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
