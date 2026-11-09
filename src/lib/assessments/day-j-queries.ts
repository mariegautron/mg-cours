import { dayJReadiness, submitModeOf } from "@/lib/assessments/day-j";
import { parseEspace, type EspaceEvaluation } from "@/lib/modules/espace";
import { createClient } from "@/lib/supabase/server";

export interface DayJExtras {
  /** Évaluations telles que publiées dans l'espace, par identifiant ; `null` = rien de publié. */
  published: Map<string, EspaceEvaluation> | null;
  qcm: Map<string, { rulesOk: boolean; drawsPrepared: boolean; opened: boolean }>;
}

/** Données annexes du « Prêt pour le jour J » : espace publié et état des QCM. */
export async function loadDayJExtras(
  moduleId: string,
  assessmentIds: string[],
): Promise<DayJExtras> {
  const supabase = await createClient();
  const [{ data: link }, { data: quizzes }] = await Promise.all([
    supabase
      .from("module_share_link")
      .select("payload")
      .eq("module_id", moduleId)
      .is("revoked_at", null)
      .maybeSingle(),
    assessmentIds.length
      ? supabase
          .from("quiz")
          .select("id, assessment_id, status, opens_at, quiz_draw_rule(id)")
          .in("assessment_id", assessmentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const espace = link ? parseEspace(link.payload) : null;
  const qcm: DayJExtras["qcm"] = new Map();
  const list = quizzes ?? [];
  const attempts = list.length
    ? ((
        await supabase
          .from("quiz_attempt")
          .select("quiz_id")
          .in(
            "quiz_id",
            list.map((q) => q.id),
          )
      ).data ?? [])
    : [];
  const withDraw = new Set(attempts.map((a) => a.quiz_id));
  for (const q of list) {
    qcm.set(q.assessment_id, {
      rulesOk: q.quiz_draw_rule.length > 0,
      drawsPrepared: withDraw.has(q.id),
      opened: q.status !== "draft",
    });
  }
  return {
    published: espace ? new Map(espace.evaluations.map((e) => [e.id, e])) : null,
    qcm,
  };
}

export interface UpcomingAssessment {
  id: string;
  title: string;
  date: string;
  moduleId: string;
  moduleName: string;
  missing: { key: string; label: string; todo: string; href: string }[];
}

/** Évaluations des `days` prochains jours (tous modules actifs), avec ce qui leur manque. */
export async function listUpcomingAssessments(
  today: string,
  days = 14,
  onlyModuleId?: string,
): Promise<UpcomingAssessment[]> {
  const supabase = await createClient();
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  let q = supabase
    .from("assessment")
    .select(
      "*, module:module_id(id, name, archived_at), assessment_group(student_group_id), course:course_id(session_date, position)",
    )
    .is("makeup_of_id", null)
    .gte("date", today)
    .lte("date", end.toISOString().slice(0, 10))
    .order("date", { ascending: true });
  if (onlyModuleId) q = q.eq("module_id", onlyModuleId);
  const { data } = await q;
  const rows = (data ?? []).filter((a) => a.module && !a.module.archived_at);
  const ids = rows.map((a) => a.id);
  const { data: quizzes } = ids.length
    ? await supabase
        .from("quiz")
        .select("id, assessment_id, status, opens_at, quiz_draw_rule(id)")
        .in("assessment_id", ids)
    : { data: [] };
  const qcmBy = new Map((quizzes ?? []).map((z) => [z.assessment_id, z]));
  return rows.map((a) => {
    const z = qcmBy.get(a.id);
    const { missing } = dayJReadiness({
      moduleId: a.module_id,
      id: a.id,
      title: a.title,
      date: a.date,
      courseId: a.course_id,
      courseDate: a.course?.session_date ?? null,
      coursePosition: (a.course as { position?: number } | null)?.position ?? null,
      prepStatus: a.prep_status,
      objective: a.objective,
      subject: a.subject,
      deliverableMd: a.deliverable_md,
      evaluatedMd: a.evaluated_md,
      gradingGridId: a.grading_grid_id,
      groupCount: a.assessment_group.length,
      isGroupGrade: a.is_group_grade,
      examKind: a.exam_kind,
      type: a.type,
      whereToSubmit: a.where_to_submit,
      submitMode: submitModeOf(a),
      files: a.files,
      isOral: a.project_role === "oral",
      qcm: z
        ? {
            rulesOk: z.quiz_draw_rule.length > 0,
            drawsPrepared: true,
            opened: z.status !== "draft",
          }
        : undefined,
    });
    return {
      id: a.id,
      title: a.title,
      date: a.date as string,
      moduleId: a.module_id,
      moduleName: a.module!.name,
      missing: missing.map((m) => ({
        key: m.key,
        label: m.label,
        todo: m.todo ?? "",
        href: m.href,
      })),
    };
  });
}
