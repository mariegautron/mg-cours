import "server-only";

import { makeupOverview, type MakeupGroup } from "@/lib/assessments/makeup-overview";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { createClient } from "@/lib/supabase/server";

/** Rattrapages d'un module (même calcul que la page Rattrapages). */
export async function loadMakeupGroups(moduleId: string): Promise<MakeupGroup[]> {
  const supabase = await createClient();
  const assessments = await listModuleAssessments(moduleId);
  const ids = assessments.map((a) => a.id);
  const makeupIds = assessments.filter((a) => a.makeup_of_id).map((a) => a.id);
  if (ids.length === 0) return [];
  const [{ data: grades }, { data: enrolledRows }, { data: students }] = await Promise.all([
    supabase
      .from("grade")
      .select("assessment_id, student_id, attendance, value")
      .in("assessment_id", ids),
    makeupIds.length
      ? supabase
          .from("assessment_student")
          .select("assessment_id, student_id")
          .in("assessment_id", makeupIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("student").select("id, first_name, last_name"),
  ]);
  const enrolled = new Map<string, string[]>();
  for (const r of (enrolledRows ?? []) as { assessment_id: string; student_id: string }[]) {
    enrolled.set(r.assessment_id, [...(enrolled.get(r.assessment_id) ?? []), r.student_id]);
  }
  const groups = makeupOverview({
    assessments,
    grades: (grades ?? []) as never,
    enrolled,
    studentNames: new Map(
      (students ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`] as const),
    ),
  });
  // « Passé ? » : copie de QCM rendue ou dépôt reçu pour le rattrapage (lecture seule).
  if (makeupIds.length) {
    const [{ data: quizzes }, { data: items }] = await Promise.all([
      supabase.from("quiz").select("id, assessment_id").in("assessment_id", makeupIds),
      supabase
        .from("submission_item")
        .select("assessment_id, student_id")
        .in("assessment_id", makeupIds),
    ]);
    const taken = new Set<string>();
    for (const it of items ?? [])
      if (it.student_id) taken.add(`${it.assessment_id}:${it.student_id}`);
    const quizOf = new Map((quizzes ?? []).map((q) => [q.id, q.assessment_id] as const));
    if (quizOf.size) {
      const { data: attempts } = await supabase
        .from("quiz_attempt")
        .select("quiz_id, student_id, submitted_at")
        .in("quiz_id", [...quizOf.keys()])
        .not("submitted_at", "is", null);
      for (const a of attempts ?? []) taken.add(`${quizOf.get(a.quiz_id)}:${a.student_id}`);
    }
    for (const g of groups)
      if (g.makeup) for (const r of g.rows) r.taken = taken.has(`${g.makeup.id}:${r.student.id}`);
  }
  return groups;
}

/** Rattrapages pas encore faits (à préparer, à inscrire ou à noter) d'un module. */
export async function countPendingMakeups(moduleId: string): Promise<number> {
  const groups = await loadMakeupGroups(moduleId);
  return groups.flatMap((g) => g.rows).filter((r) => r.step !== "done").length;
}

/** Personnes excusées dont le rattrapage de cette évaluation est préparé → lien vers ce rattrapage. */
export async function makeupHrefs(
  moduleId: string,
  assessmentId: string,
): Promise<Map<string, string>> {
  const group = (await loadMakeupGroups(moduleId)).find((g) => g.assessment.id === assessmentId);
  const out = new Map<string, string>();
  if (!group?.makeup) return out;
  for (const r of group.rows.filter((x) => x.step !== "to_enroll"))
    out.set(r.student.id, `/modules/${moduleId}/assessments/${group.makeup.id}`);
  return out;
}

/**
 * Retire une personne des rattrapages d'une évaluation quand elle n'est plus excusée, tant que
 * sa note de rattrapage n'existe pas (une note déjà saisie n'est jamais effacée). Son lien de QCM
 * de rattrapage non rendu est révoqué ; une copie déjà rendue est gardée.
 */
export async function unenrollFromMakeups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessmentId: string,
  studentId: string,
) {
  const { data: makeups } = await supabase
    .from("assessment")
    .select("id")
    .eq("makeup_of_id", assessmentId);
  for (const m of makeups ?? []) {
    const { data: g } = await supabase
      .from("grade")
      .select("value")
      .eq("assessment_id", m.id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (g?.value != null) continue;
    await supabase
      .from("assessment_student")
      .delete()
      .eq("assessment_id", m.id)
      .eq("student_id", studentId);
    // QCM de rattrapage pas encore rendu : le lien est révoqué (plus de droit au rattrapage).
    const { data: quiz } = await supabase
      .from("quiz")
      .select("id")
      .eq("assessment_id", m.id)
      .maybeSingle();
    if (quiz)
      await supabase
        .from("quiz_attempt")
        .update({ revoked_at: new Date().toISOString() })
        .eq("quiz_id", quiz.id)
        .eq("student_id", studentId)
        .neq("status", "submitted")
        .is("revoked_at", null);
  }
}
