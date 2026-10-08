import "server-only";

import { loadSubjectDeck } from "@/lib/assessments/present-data";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { canPresent, subjectSections } from "@/lib/assessments/subject";
import {
  DEFAULT_ESPACE_OPTIONS,
  parseEspace,
  type Espace,
  type EspaceEvaluation,
  type EspaceOptions,
} from "@/lib/modules/espace";
import { EMPTY_ACTIVITY } from "@/lib/modules/activity";
import { getCourseActivities } from "@/lib/modules/activity-queries";
import { getCourseResourcesFull, getModuleCourses } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { isImageMime, parseResourceFiles } from "@/lib/resources/files";
import { KIND_LABELS, studentFacing } from "@/lib/resources/kind";

const COURSE_KINDS = new Set(["course", "workshop", "project"]);

/**
 * Contenu de l'espace étudiant·e à publier. Chaque sortie passe par `studentFacing()` (ressources) ou
 * `canPresent()` (sujets) : le privé n'a aucune route vers l'instantané.
 */
export async function loadEspace(
  moduleId: string,
  options: EspaceOptions = DEFAULT_ESPACE_OPTIONS,
  quizUrl: string | null = null,
): Promise<Espace> {
  const supabase = await createClient();
  const courses = await getModuleCourses(moduleId);

  let brief: Espace["brief"] = null;
  if (options.brief) {
    const { data } = await supabase
      .from("module_project")
      .select("title, brief_md")
      .eq("module_id", moduleId)
      .maybeSingle();
    if (data?.brief_md?.trim()) brief = { title: data.title || "Le projet", text: data.brief_md };
  }

  const evaluations: EspaceEvaluation[] = [];
  if (options.evaluations) {
    const numberOf = new Map(courses.map((c, i) => [c.id, i + 1]));
    const list = (await listModuleAssessments(moduleId))
      .filter((a) => !a.makeup_of_id && canPresent(a.prep_status))
      .sort(
        (a, b) =>
          (a.course_id ? (numberOf.get(a.course_id) ?? 99) : 99) -
            (b.course_id ? (numberOf.get(b.course_id) ?? 99) : 99) ||
          (a.date ?? "").localeCompare(b.date ?? ""),
      );
    for (const a of list) {
      const deck = await loadSubjectDeck(a.id);
      if (!deck) continue;
      evaluations.push({
        title: a.title,
        type: a.type,
        groupGrade: a.is_group_grade,
        sessionNumber: a.course_id ? (numberOf.get(a.course_id) ?? null) : null,
        date: a.date,
        time: a.oral_start_time ? a.oral_start_time.slice(0, 5) : null,
        durationMinutes: a.duration_minutes,
        whereToSubmit: a.where_to_submit?.trim() || null,
        sections: subjectSections(a).map((s) => ({ heading: s.heading, text: s.text })),
        grid: deck.grid
          ? {
              maxScore: deck.grid.maxScore,
              axes: deck.grid.axes.map((x) => ({
                label: x.label,
                points: x.points,
                criteria: x.criteria,
              })),
            }
          : null,
      });
    }
  }

  const espaceCourses: Espace["courses"] = [];
  if (options.courses) {
    for (const [i, c] of courses.entries()) {
      const resources = studentFacing(await getCourseResourcesFull(c.id)).filter(
        (r) => r.kind !== null && COURSE_KINDS.has(r.kind),
      );
      if (!resources.length) continue;
      const activities = await getCourseActivities(c.id);
      espaceCourses.push({
        number: i + 1,
        title: c.title,
        date: c.session_date,
        resources: resources.map((r) => ({
          title: r.title,
          kindLabel: r.kind ? KIND_LABELS[r.kind] : null,
          content: r.content,
          url: r.url,
          minutes: (activities.byResource.get(r.id) ?? EMPTY_ACTIVITY).durationMinutes,
          images: parseResourceFiles(r.files)
            .filter((f) => isImageMime(f.mime))
            .map((f) => ({ name: f.name, path: f.path, mime: f.mime })),
        })),
      });
    }
  }

  // QCM ouvert : seulement son titre et sa fermeture (jamais ses questions).
  let quiz: Espace["quiz"] = null;
  const { data: quizzes } = await supabase
    .from("quiz")
    .select("title, closes_at, assessment!inner(module_id)")
    .eq("assessment.module_id", moduleId)
    .eq("status", "published");
  const open = (quizzes ?? []).find(
    (q) => !q.closes_at || new Date(q.closes_at).getTime() > Date.now(),
  );
  if (open) quiz = { title: open.title, closesAt: open.closes_at, url: quizUrl };

  return { options, quiz, brief, evaluations, courses: espaceCourses };
}

/** Options de l'instantané actuellement publié (cases cochées), ou les valeurs par défaut. */
export function optionsOf(payload: unknown): EspaceOptions {
  return parseEspace(payload)?.options ?? DEFAULT_ESPACE_OPTIONS;
}

/** Dernière modification des données publiables du module (séances, évaluations, brief, fiches). */
export async function latestChange(moduleId: string): Promise<string | null> {
  const supabase = await createClient();
  const [course, assessment, project, courseResources] = await Promise.all([
    supabase
      .from("course")
      .select("updated_at")
      .eq("module_id", moduleId)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("assessment")
      .select("updated_at")
      .eq("module_id", moduleId)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase.from("module_project").select("updated_at").eq("module_id", moduleId).limit(1),
    supabase
      .from("course")
      .select("course_resource(resource:resource_id(updated_at))")
      .eq("module_id", moduleId),
  ]);
  const stamps = [
    course.data?.[0]?.updated_at,
    assessment.data?.[0]?.updated_at,
    project.data?.[0]?.updated_at,
    ...(
      (courseResources.data ?? []) as unknown as {
        course_resource: { resource: { updated_at: string } | null }[];
      }[]
    ).flatMap((c) => c.course_resource.map((cr) => cr.resource?.updated_at)),
  ].filter((s): s is string => !!s);
  return stamps.sort().at(-1) ?? null;
}
