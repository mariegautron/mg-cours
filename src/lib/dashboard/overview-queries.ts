import { loadRewriteKeys } from "@/lib/assessments/oral-space-server";
import { gradeCompletion, isGradeCounted } from "@/lib/assessments/completeness";
import "server-only";

import { listModuleAssessments } from "@/lib/assessments/queries";
import { getModuleCourses } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { listModuleGroups } from "@/lib/students/queries";
import { toTwenty } from "@/lib/ynov/notation";
import { isUngradedReview } from "@/lib/assessments/progress-review";

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
  const withPhoto = [...members.values()].filter((m) => m.photo_path).length;

  const lastGraded = [...assessments]
    .filter((a) => !a.makeup_of_id && a.gradeCount > 0)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
  let graded: FocusKpis["graded"] = null;
  if (lastGraded) {
    const targetGroups = groups.filter((g) => lastGraded.groups.some((x) => x.id === g.id));
    const expected = lastGraded.is_group_grade
      ? targetGroups.length
      : new Set(targetGroups.flatMap((g) => g.members.map((m) => m.id))).size;
    const { data: rawGrades } = await supabase
      .from("grade")
      .select("value, scores, attendance")
      .eq("assessment_id", lastGraded.id)
      .not("value", "is", null);
    const grades = (rawGrades ?? []).filter((g) =>
      isGradeCounted(g, lastGraded.gridCriteria, lastGraded.auto_validated_criterion_ids),
    );
    graded = {
      title: lastGraded.title,
      done: lastGraded.gradeCount,
      expected: Math.max(expected, lastGraded.gradeCount),
      valuesOn20: grades.map((g) => toTwenty(Number(g.value), lastGraded.maxScore)),
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

export interface ToCorrect {
  assessmentId: string;
  moduleId: string;
  title: string;
  moduleName: string;
  date: string | null;
  remaining: number;
  total: number;
  /** Copies commencées mais pas finies. */
  inProgress: number;
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
      "id, title, type, review_graded, module_id, date, is_group_grade, makeup_of_id, is_bonus, auto_validated_criterion_ids, grading_grid:grading_grid_id(grid_criterion(id, is_bonus)), module:module_id(name, archived_at, finished_at), assessment_group(student_group:student_group_id(id, name, group_member(student:student_id(id, first_name, last_name))))",
    )
    .is("makeup_of_id", null);
  const rows = (data ?? []).filter((a) => {
    const m = a.module as { archived_at: string | null; finished_at?: string | null } | null;
    return m && !m.archived_at && !m.finished_at;
  });
  if (rows.length === 0) return [];
  const { data: grades } = await supabase
    .from("grade")
    .select("assessment_id, student_id, student_group_id, value, scores, attendance")
    .in(
      "assessment_id",
      rows.map((a) => a.id),
    );
  const rewrite = await loadRewriteKeys(
    supabase,
    rows.map((a) => a.id),
  );
  const criteriaOf = new Map(
    rows.map((a) => [
      a.id,
      {
        criteria: (
          (
            a.grading_grid as unknown as {
              grid_criterion: { id: string; is_bonus: boolean }[];
            } | null
          )?.grid_criterion ?? []
        ).map((c) => ({ id: c.id, isBonus: c.is_bonus })),
        auto: (a.auto_validated_criterion_ids as string[] | null) ?? [],
      },
    ]),
  );
  // Même règle que la correction : traitée = tous les critères notés, ou absence posée.
  const handled = new Set<string>();
  const startedCopies = new Map<string, number>();
  // Point d'étape (sans note) : traité = retour terminé ; en cours = retour commencé.
  const reviewIds = rows.filter((a) => isUngradedReview(a)).map((a) => a.id);
  if (reviewIds.length) {
    const { data: reviews } = await supabase
      .from("progress_review")
      .select("assessment_id, subject_id, state")
      .in("assessment_id", reviewIds);
    for (const r of reviews ?? []) {
      if (r.state === "done") handled.add(`${r.assessment_id}:${r.subject_id}`);
      else startedCopies.set(r.assessment_id, (startedCopies.get(r.assessment_id) ?? 0) + 1);
    }
  }
  for (const g of grades ?? []) {
    const c = criteriaOf.get(g.assessment_id);
    const key = `${g.assessment_id}:${g.student_group_id ?? g.student_id}`;
    const state = gradeCompletion(g, c?.criteria ?? [], c?.auto ?? []).state;
    const counted = isGradeCounted(g, c?.criteria ?? [], c?.auto ?? []);
    if (rewrite.has(key)) {
      // Oral dont la note écrite est « à réécrire » : en cours.
      startedCopies.set(g.assessment_id, (startedCopies.get(g.assessment_id) ?? 0) + 1);
    } else if (counted || g.attendance === "absent_excused") handled.add(key);
    else if (state === "partial")
      startedCopies.set(g.assessment_id, (startedCopies.get(g.assessment_id) ?? 0) + 1);
  }

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
      title: isUngradedReview(a) ? `${a.title} · sans note` : a.title,
      moduleName: (a.module as { name: string } | null)?.name ?? "",
      date: a.date,
      remaining: todo.length,
      total: ids.length,
      inProgress: startedCopies.get(a.id) ?? 0,
      nextCopyId: todo[0] ?? null,
    });
  }
  const today = new Date().toISOString().slice(0, 10);
  // QCM avec des copies rendues à relire : « À corriger » même si l'épreuve est datée du futur.
  const { data: quizzes } = await supabase.from("quiz").select("id, assessment_id");
  const { data: submittedAttempts } = quizzes?.length
    ? await supabase
        .from("quiz_attempt")
        .select("quiz_id, result")
        .eq("status", "submitted")
        .in(
          "quiz_id",
          quizzes.map((q) => q.id),
        )
    : { data: [] };
  const assessmentOfQuiz = new Map((quizzes ?? []).map((q) => [q.id, q.assessment_id]));
  const qcmToReview = new Set(
    (submittedAttempts ?? [])
      .filter((a) =>
        ((a.result as { review?: { earned: number | null }[] } | null)?.review ?? []).some(
          (r) => r.earned === null,
        ),
      )
      .map((a) => assessmentOfQuiz.get(a.quiz_id)),
  );
  return (
    out
      // En cours, entamée, sans date (oral à noter) ou déjà passée. Une épreuve datée du futur attend.
      .filter(
        (c) =>
          c.remaining < c.total ||
          c.inProgress > 0 ||
          c.date === null ||
          c.date <= today ||
          qcmToReview.has(c.assessmentId),
      )
      // Les évaluations en cours d'abord, puis par date d'épreuve (sans date en dernier).
      .sort(
        (x, y) =>
          Number(y.inProgress > 0) - Number(x.inProgress > 0) ||
          (x.date ?? "9999").localeCompare(y.date ?? "9999"),
      )
      .slice(0, limit)
  );
}
