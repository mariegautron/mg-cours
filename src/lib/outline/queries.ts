import { listModuleAssessments } from "@/lib/assessments/queries";
import { getExpectationCoverageView } from "@/lib/modules/expectation-coverage-queries";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { isOutlineSent } from "@/lib/modules/outline-sent";
import { createClient } from "@/lib/supabase/server";
import { displayTeacherName } from "@/lib/ynov/teacher-name";
import { buildOutlineContent, type OutlineContent } from "@/lib/ynov/outline";
import type { Tables } from "@/types/db";

export async function getOutline(moduleId: string): Promise<Tables<"pedagogical_outline"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedagogical_outline")
    .select("*")
    .eq("module_id", moduleId)
    .maybeSingle();
  return data;
}

export async function getTeacherName(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("teacher_profile").select("legal_name").maybeSingle();
  return displayTeacherName(data?.legal_name);
}

/** Construit le contenu actuel de la trame à partir de l'état courant du module. */
export async function buildCurrentOutline(moduleId: string): Promise<OutlineContent | null> {
  const [mod, courses, teacherName, assessments] = await Promise.all([
    getModule(moduleId),
    getModuleCourses(moduleId),
    getTeacherName(),
    listModuleAssessments(moduleId),
  ]);
  if (!mod) return null;
  const { rows } = await getExpectationCoverageView(moduleId);
  return buildOutlineContent({
    teacherName,
    module: mod,
    courses,
    assessments,
    expectationCoverage: rows.map((r) => ({
      label: r.label,
      courseIds: r.courses.map((c) => c.id),
      assessmentTitles: r.assessments.map((a) => a.title),
    })),
  });
}

/**
 * Modules dont la progression est envoyée (voir `isOutlineSent`), en deux requêtes pour toute la
 * liste. Protégé : une erreur laisse le module « non envoyé » (l'alerte reste visible).
 */
export async function listOutlineSentModuleIds(
  modules: readonly { id: string; admin_docs?: unknown }[],
): Promise<Set<string>> {
  const ids = modules.map((m) => m.id);
  if (ids.length === 0) return new Set();
  const supabase = await createClient();
  const [{ data: outlines }, { data: docs }] = await Promise.all([
    supabase.from("pedagogical_outline").select("module_id, status, sent_at").in("module_id", ids),
    supabase
      .from("module_document")
      .select("module_id, kind")
      .eq("kind", "outline_sent")
      .in("module_id", ids),
  ]);
  const outlineOf = new Map((outlines ?? []).map((o) => [o.module_id, o]));
  const sent = new Set<string>();
  for (const m of modules) {
    if (
      isOutlineSent({
        outline: outlineOf.get(m.id) ?? null,
        documents: (docs ?? []).filter((d) => d.module_id === m.id),
        adminDocs: m.admin_docs,
      })
    ) {
      sent.add(m.id);
    }
  }
  return sent;
}
