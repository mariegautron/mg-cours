import type { AssessmentFile } from "@/lib/assessments/files";
import type { Tables, TablesInsert } from "@/types/db";

/**
 * Duplication d'un module (US-98) : ce qui est propre au module se copie (évaluations, projet,
 * jalons, thèmes, sujet et fichiers), ce qui appartient à l'année ne se copie pas (notes, dates,
 * groupes, affectations de thèmes, rendus, oral, envoi des résultats, retour d'expérience).
 * Grilles et phrases réutilisables sont à Marie, pas au module : elles sont référencées, jamais
 * dupliquées.
 */

export interface CopyContext {
  moduleId: string;
  /** ancienne séance → nouvelle séance */
  courseIds: ReadonlyMap<string, string>;
  /** nouveau projet, ou `null` si le module source n'en a pas */
  projectId: string | null;
}

export function planAssessmentCopy(
  source: Tables<"assessment">,
  ctx: CopyContext,
): TablesInsert<"assessment"> {
  return {
    module_id: ctx.moduleId,
    title: source.title,
    type: source.type,
    coefficient: source.coefficient,
    subject: source.subject,
    objective: source.objective,
    deliverable_md: source.deliverable_md,
    evaluated_md: source.evaluated_md,
    duration_minutes: source.duration_minutes,
    max_score: source.max_score,
    is_group_grade: source.is_group_grade,
    grading_grid_id: source.grading_grid_id,
    auto_validated_criterion_ids: source.auto_validated_criterion_ids,
    course_id: source.course_id ? (ctx.courseIds.get(source.course_id) ?? null) : null,
    project_id: source.project_id ? ctx.projectId : null,
    project_role: source.project_id ? source.project_role : null,
    project_position: source.project_id ? source.project_position : null,
    // Un sujet déjà fourni est prêt à l'être de nouveau ; il n'a pas encore été fourni cette année.
    prep_status: source.prep_status === "provided" ? "ready" : source.prep_status,
    // Volontairement absents : date, oral_start_time, results_sent_at, experience_note, files
    // (copiés à part dans le stockage), groupes.
  };
}

/**
 * Chemin de la copie d'un fichier de sujet : `<owner>/<assessment>/<fichier>`. Le nom du fichier est
 * conservé, seul le dossier de l'évaluation change.
 */
export function copiedFilePath(path: string, ownerId: string, newAssessmentId: string): string {
  const name = path.split("/").pop() ?? path;
  return `${ownerId}/${newAssessmentId}/${name}`;
}

export function copiedFile(
  file: AssessmentFile,
  ownerId: string,
  newAssessmentId: string,
): AssessmentFile {
  return { ...file, path: copiedFilePath(file.path, ownerId, newAssessmentId) };
}

/** Évaluations d'un module ayant un retour d'expérience à relire avant de dupliquer. */
export function experienceNotes(
  assessments: readonly { title: string; experience_note: string | null }[],
): { title: string; text: string }[] {
  return assessments.flatMap((a) =>
    a.experience_note?.trim() ? [{ title: a.title, text: a.experience_note.trim() }] : [],
  );
}
