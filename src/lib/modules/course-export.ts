import type { Json } from "@/types/db";
import { studentFacing, type ResourceAudience, type ResourceStatus } from "@/lib/resources/kind";

export interface CourseExport {
  module: {
    name: string;
    ycode: string | null;
    schoolName: string | null;
    level: string | null;
    year: number;
    /** Année scolaire « 2026-2027 », déduite de la première séance. */
    schoolYear: string;
  };
  courses: {
    number: number;
    title: string;
    sessionDate: string | null;
    objectives: string[];
    material: string | null;
    /** Dernière modification de ses fiches (ISO) ; null sans fiche datée. */
    updatedAt: string | null;
    resources: {
      id: string | null;
      title: string;
      description: string | null;
      content: string | null;
      url: string | null;
      /** Fichiers joints (images des schémas) : `resource.files` tel quel. */
      files: Json | null;
    }[];
  }[];
}

/** Séance telle que lue en base pour l'export (séances triées par `position`). */
export interface ExportCourseRow {
  title: string;
  session_date: string | null;
  learning_objectives: string[];
  material: string | null;
  course_resource: {
    role: string;
    resource: {
      id?: string;
      files?: Json | null;
      updated_at?: string;
      title: string;
      description: string | null;
      content: string | null;
      url: string | null;
      audience: ResourceAudience;
      status: ResourceStatus;
    } | null;
  }[];
}

/**
 * Séances du PDF « cours », destiné aux étudiant·es : ressource principale d'abord, et jamais
 * de ressource réservée à l'enseignante (corrigés, banques de questions, notes).
 */
export function toExportCourses(rows: ExportCourseRow[]): CourseExport["courses"] {
  return rows.map((c, i) => {
    const shown = studentFacing(
      [...c.course_resource]
        .sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1))
        .map((cr) => cr.resource)
        .filter((r) => r !== null),
    );
    return {
      number: i + 1,
      title: c.title,
      sessionDate: c.session_date,
      objectives: c.learning_objectives,
      material: c.material,
      updatedAt:
        shown
          .map((r) => r.updated_at ?? "")
          .sort()
          .at(-1) || null,
      resources: shown.map(({ id, title, description, content, url, files }) => ({
        id: id ?? null,
        title,
        description,
        content,
        url,
        files: files ?? null,
      })),
    };
  });
}
