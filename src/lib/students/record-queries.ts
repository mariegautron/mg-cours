import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { GradeLine } from "./record";

type AssessmentJoin = {
  id: string;
  title: string;
  max_score: number | null;
  is_group_grade: boolean;
  module: { id: string; name: string } | null;
} | null;

/** Notes de la personne : individuelles, et celles de ses groupes (note de groupe). */
export async function listStudentGradeLines(studentId: string): Promise<GradeLine[]> {
  const supabase = await createClient();
  const select =
    "value, attendance, assessment:assessment_id(id, title, max_score, is_group_grade, module:module_id(id, name))";
  const [{ data: own }, { data: viaGroup }] = await Promise.all([
    supabase.from("grade").select(select).eq("student_id", studentId),
    supabase
      .from("group_grade_member")
      .select(
        `attendance, grade:grade_id(value, assessment:assessment_id(id, title, max_score, is_group_grade, module:module_id(id, name)))`,
      )
      .eq("student_id", studentId),
  ]);
  const lines: GradeLine[] = [];
  const push = (a: AssessmentJoin, value: number | null, attendance: GradeLine["attendance"]) => {
    if (!a?.module) return;
    lines.push({
      moduleId: a.module.id,
      moduleName: a.module.name,
      assessmentId: a.id,
      assessmentTitle: a.title,
      value,
      maxScore: a.max_score ?? 20,
      attendance,
      isGroupGrade: a.is_group_grade,
    });
  };
  for (const r of (own ?? []) as unknown as {
    value: number | null;
    attendance: GradeLine["attendance"];
    assessment: AssessmentJoin;
  }[]) {
    push(r.assessment, r.value, r.attendance);
  }
  for (const r of (viaGroup ?? []) as unknown as {
    attendance: GradeLine["attendance"];
    grade: { value: number | null; assessment: AssessmentJoin } | null;
  }[]) {
    if (r.grade) push(r.grade.assessment, r.grade.value, r.attendance);
  }
  return lines;
}

export interface StudentAppreciation {
  moduleId: string;
  moduleName: string;
  text: string;
}

/** Appréciations écrites ; table absente → `available: false`. */
export async function listStudentAppreciations(
  studentId: string,
): Promise<{ available: boolean; items: StudentAppreciation[] }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("appreciation")
      .select("text, module:module_id(id, name)")
      .eq("student_id", studentId);
    if (error || !data) return { available: false, items: [] };
    return {
      available: true,
      items: (data as unknown as { text: string; module: { id: string; name: string } | null }[])
        .filter((r) => r.module)
        .map((r) => ({ moduleId: r.module!.id, moduleName: r.module!.name, text: r.text })),
    };
  } catch {
    return { available: false, items: [] };
  }
}

export interface StudentSubmission {
  id: string;
  label: string;
  kind: string;
  assessmentId: string;
  assessmentTitle: string;
  moduleId: string;
}

/** Rendus de la personne (les siens et ceux de ses groupes) ; table absente → liste vide. */
export async function listStudentSubmissions(studentId: string): Promise<StudentSubmission[]> {
  try {
    const supabase = await createClient();
    const { data: memberships } = await supabase
      .from("group_member")
      .select("student_group_id")
      .eq("student_id", studentId);
    const groupIds = (memberships ?? []).map((m) => m.student_group_id);
    const filter = [
      `student_id.eq.${studentId}`,
      ...(groupIds.length ? [`group_id.in.(${groupIds.join(",")})`] : []),
    ].join(",");
    const { data, error } = await supabase
      .from("submission_item")
      .select("id, label, kind, assessment:assessment_id(id, title, module_id)")
      .or(filter)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (
      data as unknown as {
        id: string;
        label: string;
        kind: string;
        assessment: { id: string; title: string; module_id: string } | null;
      }[]
    )
      .filter((r) => r.assessment)
      .map((r) => ({
        id: r.id,
        label: r.label,
        kind: r.kind,
        assessmentId: r.assessment!.id,
        assessmentTitle: r.assessment!.title,
        moduleId: r.assessment!.module_id,
      }));
  } catch {
    return [];
  }
}
