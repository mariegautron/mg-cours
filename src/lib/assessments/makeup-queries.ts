import "server-only";

import { makeupOverview, type MakeupGroup } from "@/lib/assessments/makeup-overview";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Membres excusé·es des travaux de groupe (clé : évaluation), quand l'école donne un rattrapage
 * individuel ; `undefined` sinon (règle « garde la note du groupe »).
 */
export async function loadGroupExcused(
  supabase: Awaited<ReturnType<typeof createClient>>,
  moduleId: string,
  groupAssessmentIds: readonly string[],
): Promise<Map<string, string[]> | undefined> {
  if ((await getAbsenceRuleForModule(moduleId)) !== "makeup") return undefined;
  const out = new Map<string, string[]>();
  if (groupAssessmentIds.length === 0) return out;
  const { data: grades } = await supabase
    .from("grade")
    .select("id, assessment_id")
    .in("assessment_id", groupAssessmentIds)
    .not("student_group_id", "is", null);
  const assessmentOf = new Map((grades ?? []).map((g) => [g.id, g.assessment_id] as const));
  if (assessmentOf.size === 0) return out;
  const { data: members } = await supabase
    .from("group_grade_member")
    .select("grade_id, student_id, attendance")
    .in("grade_id", [...assessmentOf.keys()])
    .eq("attendance", "absent_excused");
  for (const m of members ?? []) {
    const a = assessmentOf.get(m.grade_id);
    if (a) out.set(a, [...(out.get(a) ?? []), m.student_id]);
  }
  return out;
}

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
  const groupExcused = await loadGroupExcused(
    supabase,
    moduleId,
    assessments.filter((a) => a.is_group_grade && !a.makeup_of_id).map((a) => a.id),
  );
  const enrolled = new Map<string, string[]>();
  for (const r of (enrolledRows ?? []) as { assessment_id: string; student_id: string }[]) {
    enrolled.set(r.assessment_id, [...(enrolled.get(r.assessment_id) ?? []), r.student_id]);
  }
  return makeupOverview({
    assessments,
    grades: (grades ?? []) as never,
    enrolled,
    groupExcused,
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
