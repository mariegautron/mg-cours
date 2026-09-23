/**
 * Contenu de la trame pédagogique (« progression pédagogique » YNOV).
 * Fonction pure : construit un instantané sérialisable (stocké dans
 * `pedagogical_outline.content`) à partir du module, de ses séances et du profil.
 */

export const COURSE_TYPE_LABELS: Record<string, string> = {
  lecture: "Cours théorique",
  workshop: "Atelier / TP",
  project: "Projet",
  assessment: "Évaluation",
  demo: "Démonstration",
  applied: "Cours appliqué",
};

export interface OutlineSession {
  number: number;
  title: string;
  typeLabel: string;
  sessionDate: string | null;
  objectives: string[];
  animation: string | null;
  assessment: string | null;
  material: string | null;
  resources: string[];
  contentLastUpdatedAt: string;
}

export interface OutlineContent {
  teacherName: string;
  moduleName: string;
  ycode: string | null;
  level: string | null;
  year: number;
  schoolName: string | null;
  totalHours: number;
  hoursLecture: number | null;
  hoursTd: number | null;
  hoursTp: number | null;
  /** Date de dernière MAJ de la trame (= date de génération). */
  generatedAt: string;
  sessions: OutlineSession[];
}

export interface OutlineInput {
  teacherName: string;
  module: {
    name: string;
    ycode: string | null;
    level: string | null;
    year: number;
    total_hours: number;
    hours_lecture: number | null;
    hours_td: number | null;
    hours_tp: number | null;
    school: { name: string } | null;
  };
  courses: {
    title: string;
    type: string;
    position: number;
    session_date: string | null;
    learning_objectives: string[];
    animation_notes: string | null;
    assessment_notes: string | null;
    material: string | null;
    content_last_updated_at: string;
    resources: { title: string }[];
  }[];
  now?: Date;
}

export function buildOutlineContent(input: OutlineInput): OutlineContent {
  const { module: m } = input;
  const sessions = [...input.courses]
    .sort((a, b) => a.position - b.position)
    .map<OutlineSession>((c, i) => ({
      number: i + 1,
      title: c.title,
      typeLabel: COURSE_TYPE_LABELS[c.type] ?? c.type,
      sessionDate: c.session_date,
      objectives: c.learning_objectives,
      animation: c.animation_notes,
      assessment: c.assessment_notes,
      material: c.material,
      resources: c.resources.map((r) => r.title),
      contentLastUpdatedAt: c.content_last_updated_at,
    }));

  return {
    teacherName: input.teacherName,
    moduleName: m.name,
    ycode: m.ycode,
    level: m.level,
    year: m.year,
    schoolName: m.school?.name ?? null,
    totalHours: m.total_hours,
    hoursLecture: m.hours_lecture,
    hoursTd: m.hours_td,
    hoursTp: m.hours_tp,
    generatedAt: (input.now ?? new Date()).toISOString(),
    sessions,
  };
}
