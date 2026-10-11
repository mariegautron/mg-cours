import "server-only";

import type { PlanningCategory, PlanningInput } from "@/lib/modules/planning";
import { createClient } from "@/lib/supabase/server";

interface CourseRow {
  id: string;
  position: number;
  title: string;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  course_resource: {
    role: string;
    start_time: string | null;
    duration_minutes: number | null;
    resource: { title: string; kind: string } | null;
  }[];
}

const CATEGORY: Record<string, PlanningCategory> = {
  course: "cours",
  workshop: "pratique",
  project: "projet",
  teacher_notes: "evaluation",
};

/** « HH:MM:SS » à l'heure de Paris pour un instant ISO. */
function parisTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Paris",
  });
}

/** Séances d'un module avec leur déroulé (ressources principales), le QCM et l'oral à leur heure. */
export async function loadPlanning(
  moduleId: string,
): Promise<{ name: string; sessions: PlanningInput[] } | null> {
  const supabase = await createClient();
  const [{ data: mod }, { data: courses }, { data: assessments }] = await Promise.all([
    supabase.from("module").select("name").eq("id", moduleId).maybeSingle(),
    supabase
      .from("course")
      .select(
        "id, position, title, session_date, start_time, end_time, course_resource(role, start_time, duration_minutes, resource:resource_id(title, kind))",
      )
      .eq("module_id", moduleId)
      .order("position"),
    supabase
      .from("assessment")
      .select("id, title, type, course_id, oral_start_time, duration_minutes")
      .eq("module_id", moduleId),
  ]);
  if (!mod) return null;
  const ids = (assessments ?? []).map((a) => a.id);
  const [{ data: quizzes }, { data: groups }] = ids.length
    ? await Promise.all([
        supabase
          .from("quiz")
          .select("assessment_id, opens_at, duration_minutes")
          .in("assessment_id", ids),
        supabase.from("assessment_group").select("assessment_id").in("assessment_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  // Groupes de projet : ceux rattachés à l'évaluation ; sinon la promotion répartie en groupes de 4.
  const { data: studentGroups } = await supabase
    .from("student_group")
    .select("id")
    .eq("module_id", moduleId);
  const groupIds = (studentGroups ?? []).map((g) => g.id);
  const { data: members } = groupIds.length
    ? await supabase.from("group_member").select("student_id").in("student_group_id", groupIds)
    : { data: [] };
  const promoSize = new Set((members ?? []).map((m) => m.student_id)).size;
  const sessions = ((courses ?? []) as unknown as CourseRow[]).map<PlanningInput>((c) => {
    const own = (assessments ?? []).filter((a) => a.course_id === c.id);
    const events: PlanningInput["items"] = [];
    for (const a of own) {
      const quiz = (quizzes ?? []).find((q) => q.assessment_id === a.id);
      if (quiz?.opens_at && quiz.duration_minutes) {
        events.push({
          title: `Évaluation individuelle : ${a.title}`,
          startTime: parisTime(quiz.opens_at),
          minutes: quiz.duration_minutes,
          category: "evaluation",
        });
      } else if (a.type === "oral" && a.oral_start_time && a.duration_minutes) {
        const attached = (groups ?? []).filter((g) => g.assessment_id === a.id).length;
        const n = attached || Math.max(1, Math.ceil(promoSize / 4));
        events.push({
          title: `Soutenances : ${a.title} (${n} × ${a.duration_minutes} min)`,
          startTime: a.oral_start_time,
          minutes: a.duration_minutes * n,
          category: "evaluation",
        });
      }
    }
    return {
      id: c.id,
      position: c.position,
      title: c.title,
      sessionDate: c.session_date,
      startTime: c.start_time,
      endTime: c.end_time,
      items: [
        ...c.course_resource
          .filter((cr) => cr.role === "primary" && cr.resource)
          .map((cr) => ({
            title: cr.resource!.title,
            startTime: cr.start_time,
            minutes: cr.duration_minutes,
            category: CATEGORY[cr.resource!.kind] ?? ("cours" as const),
          })),
        ...events,
      ],
      assessments: own.map((a) => ({
        title: a.title,
        type: a.type,
        oralStartTime: a.oral_start_time,
      })),
    };
  });
  return { name: mod.name, sessions };
}
