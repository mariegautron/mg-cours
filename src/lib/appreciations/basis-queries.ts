import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ObservationTag } from "@/lib/notebook/notebook";

export interface CorrectionComment {
  assessmentId: string;
  assessmentTitle: string;
  /** Copie de groupe (commentaires partagés par le groupe) ou individuelle. */
  isGroup: boolean;
  strengths: string | null;
  progress: string | null;
  feedback: string | null;
  /** Mot personnel pour cette personne (copie de groupe). */
  personalNote: string | null;
}

export interface BasisObservation {
  id: string;
  tag: ObservationTag;
  note: string | null;
  createdAt: string;
  courseTitle: string | null;
  sessionDate: string | null;
}

export interface AppreciationBasis {
  comments: CorrectionComment[];
  observations: BasisObservation[];
  /** Groupe de la personne dans le module et observations faites sur le groupe entier. */
  group: { id: string; name: string; observations: BasisObservation[] } | null;
}

/** Observations de groupe : protégé, la table arrive avec la migration (liste vide sinon). */
async function groupBasis(
  moduleId: string,
  studentId: string,
): Promise<AppreciationBasis["group"]> {
  try {
    const supabase = await createClient();
    const { data: member } = await supabase
      .from("group_member")
      .select("student_group:student_group_id!inner(id, name, module_id)")
      .eq("student_id", studentId)
      .eq("student_group.module_id", moduleId)
      .limit(1)
      .maybeSingle();
    const g = (member as unknown as { student_group: { id: string; name: string } | null } | null)
      ?.student_group;
    if (!g) return null;
    const { data, error } = await supabase
      .from("group_observation")
      .select("id, tag, note, created_at, course:course_id(title, session_date)")
      .eq("student_group_id", g.id)
      .order("created_at", { ascending: true });
    return {
      id: g.id,
      name: g.name,
      observations: error
        ? []
        : (
            (data ?? []) as unknown as {
              id: string;
              tag: ObservationTag;
              note: string | null;
              created_at: string;
              course: { title: string; session_date: string | null } | null;
            }[]
          ).map((o) => ({
            id: o.id,
            tag: o.tag,
            note: o.note,
            createdAt: o.created_at,
            courseTitle: o.course?.title ?? null,
            sessionDate: o.course?.session_date ?? null,
          })),
    };
  } catch {
    return null;
  }
}

const clean = (v: string | null | undefined) => v?.trim() || null;

/** Commentaires de correction (copie individuelle et copie de groupe) et observations d'une personne dans un module. */
export async function getAppreciationBasis(
  moduleId: string,
  studentId: string,
): Promise<AppreciationBasis> {
  const supabase = await createClient();
  const [{ data: own }, { data: viaGroup }, { data: obs }, group] = await Promise.all([
    supabase
      .from("grade")
      .select("strengths, progress, feedback, assessment:assessment_id!inner(id, title, module_id)")
      .eq("student_id", studentId)
      .eq("assessment.module_id", moduleId),
    supabase
      .from("group_grade_member")
      .select(
        "justification, grade:grade_id!inner(strengths, progress, feedback, assessment:assessment_id!inner(id, title, module_id))",
      )
      .eq("student_id", studentId)
      .eq("grade.assessment.module_id", moduleId),
    supabase
      .from("student_observation")
      .select("id, tag, note, created_at, course:course_id(title, session_date)")
      .eq("module_id", moduleId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: true }),
    groupBasis(moduleId, studentId),
  ]);

  type A = { id: string; title: string } | null;
  const comments: CorrectionComment[] = [];
  for (const r of (own ?? []) as unknown as {
    strengths: string | null;
    progress: string | null;
    feedback: string | null;
    assessment: A;
  }[]) {
    if (!r.assessment) continue;
    comments.push({
      assessmentId: r.assessment.id,
      assessmentTitle: r.assessment.title,
      isGroup: false,
      strengths: clean(r.strengths),
      progress: clean(r.progress),
      feedback: clean(r.feedback),
      personalNote: null,
    });
  }
  for (const r of (viaGroup ?? []) as unknown as {
    justification: string | null;
    grade: {
      strengths: string | null;
      progress: string | null;
      feedback: string | null;
      assessment: A;
    } | null;
  }[]) {
    if (!r.grade?.assessment) continue;
    comments.push({
      assessmentId: r.grade.assessment.id,
      assessmentTitle: r.grade.assessment.title,
      isGroup: true,
      strengths: clean(r.grade.strengths),
      progress: clean(r.grade.progress),
      feedback: clean(r.grade.feedback),
      personalNote: clean(r.justification),
    });
  }

  // Copies de groupe : tous les membres en ont les commentaires (« même bateau »), pas seulement
  // ceux qui ont une ligne de présence particulière (group_grade_member).
  const { data: memberships } = await supabase
    .from("group_member")
    .select("student_group_id, student_group:student_group_id!inner(module_id)")
    .eq("student_id", studentId)
    .eq("student_group.module_id", moduleId);
  const groupIds = (memberships ?? []).map((m) => m.student_group_id);
  if (groupIds.length) {
    const { data: groupGrades } = await supabase
      .from("grade")
      .select("strengths, progress, feedback, assessment:assessment_id!inner(id, title, module_id)")
      .in("student_group_id", groupIds)
      .eq("assessment.module_id", moduleId);
    for (const r of (groupGrades ?? []) as unknown as {
      strengths: string | null;
      progress: string | null;
      feedback: string | null;
      assessment: A;
    }[]) {
      if (!r.assessment) continue;
      if (comments.some((c) => c.isGroup && c.assessmentId === r.assessment!.id)) continue;
      comments.push({
        assessmentId: r.assessment.id,
        assessmentTitle: r.assessment.title,
        isGroup: true,
        strengths: clean(r.strengths),
        progress: clean(r.progress),
        feedback: clean(r.feedback),
        personalNote: null,
      });
    }
  }

  return {
    group,
    comments: comments
      .filter((c) => c.strengths || c.progress || c.feedback || c.personalNote)
      .sort((a, b) => a.assessmentTitle.localeCompare(b.assessmentTitle, "fr")),
    observations: (
      (obs ?? []) as unknown as {
        id: string;
        tag: ObservationTag;
        note: string | null;
        created_at: string;
        course: { title: string; session_date: string | null } | null;
      }[]
    ).map((o) => ({
      id: o.id,
      tag: o.tag,
      note: o.note,
      createdAt: o.created_at,
      courseTitle: o.course?.title ?? null,
      sessionDate: o.course?.session_date ?? null,
    })),
  };
}
