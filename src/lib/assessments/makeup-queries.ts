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
  return makeupOverview({
    assessments,
    grades: (grades ?? []) as never,
    enrolled,
    studentNames: new Map(
      (students ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`] as const),
    ),
  });
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
 * sa note de rattrapage n'existe pas (une note déjà saisie n'est jamais effacée).
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
  }
}
