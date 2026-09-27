import { studentFacing, type ResourceAudience } from "@/lib/resources/kind";

export interface CourseExport {
  module: {
    name: string;
    ycode: string | null;
    schoolName: string | null;
    level: string | null;
    year: number;
  };
  courses: {
    number: number;
    title: string;
    sessionDate: string | null;
    objectives: string[];
    material: string | null;
    resources: {
      title: string;
      description: string | null;
      content: string | null;
      url: string | null;
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
      title: string;
      description: string | null;
      content: string | null;
      url: string | null;
      audience: ResourceAudience;
    } | null;
  }[];
}

/**
 * Séances du PDF « cours », destiné aux étudiant·es : ressource principale d'abord, et jamais
 * de ressource réservée à l'enseignante (corrigés, banques de questions, notes).
 */
export function toExportCourses(rows: ExportCourseRow[]): CourseExport["courses"] {
  return rows.map((c, i) => ({
    number: i + 1,
    title: c.title,
    sessionDate: c.session_date,
    objectives: c.learning_objectives,
    material: c.material,
    resources: studentFacing(
      [...c.course_resource]
        .sort((a, b) => (a.role === b.role ? 0 : a.role === "primary" ? -1 : 1))
        .map((cr) => cr.resource)
        .filter((r) => r !== null),
    ).map(({ title, description, content, url }) => ({ title, description, content, url })),
  }));
}
