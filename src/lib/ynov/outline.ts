/**
 * Contenu de la progression pédagogique YNOV (rédigée d’après la « trame » fournie par l’école).
 * Fonction pure : construit un instantané sérialisable (stocké dans
 * `pedagogical_outline.content`) à partir du module, de ses séances, de leurs évaluations et du
 * profil. Le texte est dérivé des séances, sans les éléments privés (voir `private-text.ts`).
 */

import { formatTime } from "@/lib/modules/course-duration";
import { publishableText } from "@/lib/ynov/private-text";
import { schoolYear } from "@/lib/ynov/teacher-name";

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
  /** Horaires `HH:MM` ; absents des progressions générées avant. */
  startTime?: string | null;
  endTime?: string | null;
  objectives: string[];
  /** Markdown publiable. */
  animation: string | null;
  /** Markdown publiable : évaluations rattachées, sinon note de la séance. */
  assessment: string | null;
  material: string | null;
}

export interface OutlineContent {
  teacherName: string;
  moduleName: string;
  ycode: string | null;
  level: string | null;
  year: number;
  /** « 2026-2027 » ; absent des progressions générées avant. */
  schoolYear?: string;
  schoolName: string | null;
  totalHours: number;
  hoursLecture: number | null;
  hoursTd: number | null;
  hoursTp: number | null;
  /** Date de dernière MAJ de la trame (= date de génération). */
  generatedAt: string;
  sessions: OutlineSession[];
}

export interface OutlineAssessmentInput {
  course_id: string | null;
  title: string;
  type: string | null;
  date: string | null;
  duration_minutes: number | null;
  evaluated_md: string | null;
  where_to_submit: string | null;
  makeup_of_id?: string | null;
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
    first_session_date?: string | null;
    school: { name: string } | null;
  };
  courses: {
    id?: string;
    title: string;
    type: string;
    position: number;
    session_date: string | null;
    start_time?: string | null;
    end_time?: string | null;
    learning_objectives: string[];
    animation_notes: string | null;
    assessment_notes: string | null;
    material: string | null;
  }[];
  /** Évaluations du module : celles rattachées à une séance alimentent « Modalités d'évaluation ». */
  assessments?: OutlineAssessmentInput[];
  now?: Date;
}

const frDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" });

const frMinutes = (min: number) =>
  min % 60 === 0
    ? `${min / 60} h`
    : min >= 60
      ? `${Math.floor(min / 60)} h ${min % 60}`
      : `${min} min`;

/**
 * « Modalités d'évaluation » d'une séance : type, date, durée, rendu et ce qui est évalué, jamais le
 * barème. Sans évaluation rattachée : la note de la séance, sinon une mention sobre.
 */
export function evaluationMarkdown(
  assessments: readonly OutlineAssessmentInput[],
  fallbackNote: string | null,
): string {
  if (assessments.length === 0) {
    return publishableText(fallbackNote).text || "Pas d’évaluation notée à cette séance.";
  }
  return assessments
    .map((a) => {
      const facts = [
        a.date ? `Date : ${frDate(a.date)}` : null,
        a.duration_minutes ? `Durée : ${frMinutes(a.duration_minutes)}` : null,
        a.where_to_submit?.trim() ? `Rendu : ${a.where_to_submit.trim()}` : null,
      ].filter(Boolean);
      const evaluated = publishableText(a.evaluated_md).text;
      return [
        `**${a.type?.trim() ? `${a.type.trim()} — ` : ""}${a.title}**`,
        facts.length ? facts.map((f) => `- ${f}`).join("\n") : "",
        evaluated ? `Ce qui est évalué :\n${evaluated}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export function buildOutlineContent(input: OutlineInput): OutlineContent {
  const { module: m } = input;
  const ordered = [...input.courses].sort((a, b) => a.position - b.position);
  const assessments = (input.assessments ?? []).filter((a) => !a.makeup_of_id);
  const sessions = ordered.map<OutlineSession>((c, i) => ({
    number: i + 1,
    title: c.title,
    typeLabel: COURSE_TYPE_LABELS[c.type] ?? c.type,
    sessionDate: c.session_date,
    startTime: formatTime(c.start_time ?? null) || null,
    endTime: formatTime(c.end_time ?? null) || null,
    objectives: c.learning_objectives,
    animation: publishableText(c.animation_notes).text || null,
    assessment: evaluationMarkdown(
      assessments.filter((a) => a.course_id && a.course_id === c.id),
      c.assessment_notes,
    ),
    material: publishableText(c.material).text || null,
  }));

  const firstDate =
    m.first_session_date ?? ordered.find((c) => c.session_date)?.session_date ?? null;
  return {
    teacherName: input.teacherName,
    moduleName: m.name,
    ycode: m.ycode,
    level: m.level,
    year: m.year,
    schoolYear: schoolYear(firstDate, m.year),
    schoolName: m.school?.name ?? null,
    totalHours: m.total_hours,
    hoursLecture: m.hours_lecture,
    hoursTd: m.hours_td,
    hoursTp: m.hours_tp,
    generatedAt: (input.now ?? new Date()).toISOString(),
    sessions,
  };
}
