import "server-only";

import { listModuleAssessments } from "@/lib/assessments/queries";
import { getModuleCourses } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { listModuleGroups } from "@/lib/students/queries";
import { toTwenty } from "@/lib/ynov/notation";

export interface FocusKpis {
  moduleId: string;
  moduleName: string;
  courses: { done: number; total: number };
  /** Dernière évaluation notée du module : « Jalon 1 corrigé 6 / 6, moyenne 14,1 ». */
  graded: { title: string; done: number; expected: number; valuesOn20: number[] } | null;
  students: { total: number; withPhoto: number; observations: number };
  groupNames: string[];
}

/** Chiffres de l'écran « Aujourd'hui » pour un module (celui de la séance du jour, ou du prochain cours). */
export async function loadFocusKpis(moduleId: string, moduleName: string): Promise<FocusKpis> {
  const supabase = await createClient();
  const [courses, assessments, groups, observations] = await Promise.all([
    getModuleCourses(moduleId),
    listModuleAssessments(moduleId),
    listModuleGroups(moduleId),
    supabase
      .from("student_observation")
      .select("id", { count: "exact", head: true })
      .eq("module_id", moduleId),
  ]);

  const members = new Map(groups.flatMap((g) => g.members).map((m) => [m.id, m]));
  const withPhoto = [...members.values()].filter((m) => m.photo_path || m.photo_url).length;

  const lastGraded = [...assessments]
    .filter((a) => !a.makeup_of_id && a.gradeCount > 0)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
  let graded: FocusKpis["graded"] = null;
  if (lastGraded) {
    const targetGroups = groups.filter((g) => lastGraded.groups.some((x) => x.id === g.id));
    const expected = lastGraded.is_group_grade
      ? targetGroups.length
      : new Set(targetGroups.flatMap((g) => g.members.map((m) => m.id))).size;
    const { data: grades } = await supabase
      .from("grade")
      .select("value")
      .eq("assessment_id", lastGraded.id)
      .not("value", "is", null);
    graded = {
      title: lastGraded.title,
      done: lastGraded.gradeCount,
      expected: Math.max(expected, lastGraded.gradeCount),
      valuesOn20: (grades ?? []).map((g) => toTwenty(Number(g.value), lastGraded.maxScore)),
    };
  }

  return {
    moduleId,
    moduleName,
    courses: {
      done: courses.filter((c) => c.completion === "done" || c.completion === "partial").length,
      total: courses.length,
    },
    graded,
    students: { total: members.size, withPhoto, observations: observations.count ?? 0 },
    groupNames: groups.map((g) => g.name),
  };
}

export interface PreviousSession {
  number: number;
  date: string | null;
  nextTime: string | null;
  notCovered: string | null;
}

/** Séance précédente du module : consigne donnée aux étudiant·es et ce qui n'a pas été traité. */
export async function loadPreviousSession(
  moduleId: string,
  courseId: string,
): Promise<PreviousSession | null> {
  const courses = await getModuleCourses(moduleId);
  const index = courses.findIndex((c) => c.id === courseId);
  const prev = index > 0 ? courses[index - 1] : null;
  if (!prev) return null;
  return {
    number: index,
    date: prev.session_date,
    nextTime: prev.next_time,
    notCovered: prev.not_covered,
  };
}

/** Évaluations rattachées à une séance (pour « Aujourd'hui : rendu du jalon 1 »). */
export async function loadCourseAssessments(moduleId: string, courseId: string) {
  const assessments = await listModuleAssessments(moduleId);
  return assessments
    .filter((a) => a.course_id === courseId && !a.makeup_of_id)
    .map((a) => ({ id: a.id, title: a.title }));
}

/** Avancement des séances par module (faites / total), pour « Tes modules en cours ». */
export async function listCourseProgress(): Promise<Map<string, { done: number; total: number }>> {
  const supabase = await createClient();
  const { data } = await supabase.from("course").select("module_id, completion");
  const map = new Map<string, { done: number; total: number }>();
  for (const c of data ?? []) {
    const cur = map.get(c.module_id) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (c.completion === "done" || c.completion === "partial") cur.done += 1;
    map.set(c.module_id, cur);
  }
  return map;
}

/** Moyenne de toutes les notes du module, ramenées sur 20 (bilan d'un module terminé). */
export async function loadModuleMean(moduleId: string): Promise<number[]> {
  const supabase = await createClient();
  const assessments = await listModuleAssessments(moduleId);
  const byId = new Map(assessments.filter((a) => !a.makeup_of_id).map((a) => [a.id, a.maxScore]));
  if (byId.size === 0) return [];
  const { data } = await supabase
    .from("grade")
    .select("assessment_id, value")
    .in("assessment_id", [...byId.keys()])
    .not("value", "is", null);
  return (data ?? []).map((g) => toTwenty(Number(g.value), byId.get(g.assessment_id) ?? 20));
}
