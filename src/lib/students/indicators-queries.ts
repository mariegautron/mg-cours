import "server-only";

import { createClient } from "@/lib/supabase/server";

import { pendingByStudent, studentIndicators, type Indicator } from "./indicators";

/** Indicateurs de toutes les tuiles. Tolérant : une table absente retire simplement l'indicateur. */
export async function loadStudentIndicators(): Promise<Map<string, Indicator[]>> {
  const supabase = await createClient();
  const [{ data: members }, apprec, subs, grades, ggm] = await Promise.all([
    supabase
      .from("group_member")
      .select("student_id, student_group_id, student_group:student_group_id(module_id)"),
    supabase.from("appreciation").select("student_id, module_id, text"),
    supabase.from("submission_item").select("assessment_id, student_id, group_id"),
    supabase.from("grade").select("id, assessment_id, student_id, student_group_id, value"),
    supabase.from("group_grade_member").select("student_id, grade_id"),
  ]).catch(
    () =>
      [
        { data: null },
        { data: null, error: true },
        { data: null, error: true },
        { data: null, error: true },
        { data: null, error: true },
      ] as never,
  );

  const rows = (members ?? []) as unknown as {
    student_id: string;
    student_group_id: string;
    student_group: { module_id: string } | null;
  }[];
  const modulesOf = new Map<string, Set<string>>();
  const membersByGroup = new Map<string, string[]>();
  for (const r of rows) {
    if (r.student_group) {
      modulesOf.set(
        r.student_id,
        (modulesOf.get(r.student_id) ?? new Set()).add(r.student_group.module_id),
      );
    }
    membersByGroup.set(r.student_group_id, [
      ...(membersByGroup.get(r.student_group_id) ?? []),
      r.student_id,
    ]);
  }

  const appreciationsAvailable = !apprec.error && !!apprec.data;
  const written = new Map<string, Set<string>>();
  for (const a of apprec.data ?? []) {
    if (a.text.trim())
      written.set(a.student_id, (written.get(a.student_id) ?? new Set()).add(a.module_id));
  }

  let pending = new Map<string, Set<string>>();
  if (!subs.error && subs.data && !grades.error) {
    // Notes de groupe : chaque membre d'un groupe noté est noté·e (group_grade_member).
    const gradeRows = grades.data ?? [];
    const byId = new Map(gradeRows.map((g) => [g.id, g]));
    const gradeRefs = gradeRows.map((g) => ({
      assessmentId: g.assessment_id,
      studentId: g.student_id,
      groupId: g.student_group_id,
      value: g.value,
    }));
    for (const m of ggm.data ?? []) {
      const g = byId.get(m.grade_id);
      if (g && g.value !== null) {
        gradeRefs.push({
          assessmentId: g.assessment_id,
          studentId: m.student_id,
          groupId: null,
          value: g.value,
        });
      }
    }
    pending = pendingByStudent(
      subs.data.map((s) => ({
        assessmentId: s.assessment_id,
        studentId: s.student_id,
        groupId: s.group_id,
      })),
      gradeRefs,
      membersByGroup,
    );
  }

  const out = new Map<string, Indicator[]>();
  for (const [studentId, modules] of modulesOf) {
    out.set(
      studentId,
      studentIndicators({
        modules: modules.size,
        appreciated: [...modules].filter((m) => written.get(studentId)?.has(m)).length,
        toGrade: pending.get(studentId)?.size ?? 0,
        appreciationsAvailable,
      }),
    );
  }
  for (const [studentId, set] of pending) {
    if (!out.has(studentId)) {
      out.set(
        studentId,
        studentIndicators({
          modules: 0,
          appreciated: 0,
          toGrade: set.size,
          appreciationsAvailable,
        }),
      );
    }
  }
  return out;
}
