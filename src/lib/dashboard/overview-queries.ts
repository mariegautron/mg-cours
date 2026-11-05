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
  // Une note bonus n'entre pas dans le bilan de la classe : elle ne sert qu'à remonter une moyenne.
  const byId = new Map(
    assessments.filter((a) => !a.makeup_of_id && !a.is_bonus).map((a) => [a.id, a.maxScore]),
  );
  if (byId.size === 0) return [];
  const { data } = await supabase
    .from("grade")
    .select("assessment_id, value")
    .in("assessment_id", [...byId.keys()])
    .not("value", "is", null);
  return (data ?? []).map((g) => toTwenty(Number(g.value), byId.get(g.assessment_id) ?? 20));
}

export interface ToCorrect {
  assessmentId: string;
  moduleId: string;
  title: string;
  moduleName: string;
  date: string | null;
  remaining: number;
  total: number;
  /** Première copie qui reste à corriger (`?copy=`). */
  nextCopyId: string | null;
}

/**
 * Évaluations dont il reste des copies à corriger (modules ni rangés ni terminés), la plus ancienne
 * épreuve d'abord. Une copie compte comme traitée quand elle a une note ou une absence excusée.
 */
export async function listToCorrect(limit = 3): Promise<ToCorrect[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessment")
    .select(
      "id, title, module_id, date, is_group_grade, makeup_of_id, is_bonus, module:module_id(name, archived_at, finished_at), assessment_group(student_group:student_group_id(id, name, group_member(student:student_id(id, first_name, last_name))))",
    )
    .is("makeup_of_id", null);
  const rows = (data ?? []).filter((a) => {
    const m = a.module as { archived_at: string | null; finished_at?: string | null } | null;
    return m && !m.archived_at && !m.finished_at;
  });
  if (rows.length === 0) return [];
  const { data: grades } = await supabase
    .from("grade")
    .select("assessment_id, student_id, student_group_id, value, attendance")
    .in(
      "assessment_id",
      rows.map((a) => a.id),
    );
  const handled = new Set(
    (grades ?? [])
      .filter((g) => g.value !== null || g.attendance === "absent_excused")
      .map((g) => `${g.assessment_id}:${g.student_group_id ?? g.student_id}`),
  );

  const out: ToCorrect[] = [];
  for (const a of rows) {
    const groups = (
      a.assessment_group as unknown as {
        student_group: {
          id: string;
          name: string;
          group_member: { student: { id: string; first_name: string; last_name: string } | null }[];
        } | null;
      }[]
    )
      .map((ag) => ag.student_group)
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .sort((x, y) => x.name.localeCompare(y.name, "fr"));
    let ids: string[];
    if (a.is_group_grade) ids = groups.map((g) => g.id);
    else {
      const seen = new Set<string>();
      ids = [];
      for (const g of groups) {
        const members = g.group_member
          .map((m) => m.student)
          .filter((s): s is NonNullable<typeof s> => s !== null)
          .sort(
            (x, y) =>
              x.last_name.localeCompare(y.last_name, "fr") ||
              x.first_name.localeCompare(y.first_name, "fr"),
          );
        for (const s of members) {
          if (!seen.has(s.id)) {
            seen.add(s.id);
            ids.push(s.id);
          }
        }
      }
    }
    if (ids.length === 0) continue;
    const todo = ids.filter((id) => !handled.has(`${a.id}:${id}`));
    // Rien de noté du tout et pas de date : évaluation pas encore passée, on ne la réclame pas.
    if (todo.length === 0) continue;
    out.push({
      assessmentId: a.id,
      moduleId: a.module_id,
      title: a.title,
      moduleName: (a.module as { name: string } | null)?.name ?? "",
      date: a.date,
      remaining: todo.length,
      total: ids.length,
      nextCopyId: todo[0] ?? null,
    });
  }
  const today = new Date().toISOString().slice(0, 10);
  return out
    .filter((c) => c.remaining < c.total || (c.date !== null && c.date <= today))
    .sort((x, y) => (x.date ?? "9999").localeCompare(y.date ?? "9999"))
    .slice(0, limit);
}
