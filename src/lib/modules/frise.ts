/**
 * US-130 : frise du module (projetée en classe, ou partagée par lien en lecture seule).
 * Fonctions pures. L'instantané public ne contient que des titres, dates et types de note :
 * jamais d'étudiant·e, de note, de ressource ni de montant.
 */

export interface FriseCourseInput {
  title: string;
  session_date: string | null;
  start_time: string | null;
}

export interface FriseAssessmentInput {
  title: string;
  course_id: string | null;
  is_group_grade: boolean;
  makeup_of_id: string | null;
}

export type MilestoneKind = "group" | "individual";

export interface FriseSession {
  number: number;
  /** AAAA-MM-JJ ou null. */
  date: string | null;
  period: "morning" | "afternoon" | null;
  title: string;
}

export interface FriseMilestone {
  title: string;
  /** Numéro de la séance où il a lieu ; null si non rattaché. */
  sessionNumber: number | null;
  kind: MilestoneKind;
}

export interface Frise {
  moduleName: string;
  totalHours: number | null;
  sessions: FriseSession[];
  milestones: FriseMilestone[];
}

/** Matin avant 12 h 30, après-midi ensuite ; null sans heure. */
export function periodOf(startTime: string | null): FriseSession["period"] {
  if (!startTime) return null;
  const [h, m] = startTime.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0) < 12 * 60 + 30 ? "morning" : "afternoon";
}

export function buildFrise(input: {
  moduleName: string;
  totalHours: number | null;
  /** Dans l'ordre des séances. */
  courses: (FriseCourseInput & { id: string })[];
  assessments: (FriseAssessmentInput & { id: string })[];
}): Frise {
  const numberById = new Map(input.courses.map((c, i) => [c.id, i + 1]));
  const sessions = input.courses.map((c, i) => ({
    number: i + 1,
    date: c.session_date,
    period: periodOf(c.start_time),
    title: c.title,
  }));
  const milestones = input.assessments
    .filter((a) => !a.makeup_of_id)
    .map((a) => ({
      title: a.title,
      sessionNumber: a.course_id ? (numberById.get(a.course_id) ?? null) : null,
      kind: (a.is_group_grade ? "group" : "individual") as MilestoneKind,
    }))
    .sort((a, b) => (a.sessionNumber ?? 999) - (b.sessionNumber ?? 999));
  return { moduleName: input.moduleName, totalHours: input.totalHours, sessions, milestones };
}

export const PERIOD_LABELS = { morning: "matin", afternoon: "après-midi" } as const;
export const KIND_LABELS: Record<MilestoneKind, string> = {
  group: "Note de groupe",
  individual: "Note individuelle",
};

/** « 12/10 » depuis AAAA-MM-JJ. */
export function shortDate(date: string | null): string {
  const m = date?.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${m[2]}/${m[1]}` : "date à fixer";
}

export function summaryLine(f: Frise): string {
  const n = f.sessions.length;
  const parts = [`${n} séance${n > 1 ? "s" : ""}`];
  if (f.totalHours) parts.push(`${f.totalHours} heures`);
  const notes = f.milestones.length;
  if (notes) parts.push(`${notes} note${notes > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

/** Relit un instantané venu de la base (jsonb) ; null s'il n'a pas la forme attendue. */
export function parseFrise(raw: unknown): Frise | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.moduleName !== "string" ||
    !Array.isArray(r.sessions) ||
    !Array.isArray(r.milestones)
  ) {
    return null;
  }
  const sessions: FriseSession[] = [];
  for (const s of r.sessions) {
    const o = s as Record<string, unknown>;
    if (typeof o?.number !== "number" || typeof o.title !== "string") return null;
    sessions.push({
      number: o.number,
      title: o.title,
      date: typeof o.date === "string" ? o.date : null,
      period: o.period === "morning" || o.period === "afternoon" ? o.period : null,
    });
  }
  const milestones: FriseMilestone[] = [];
  for (const m of r.milestones) {
    const o = m as Record<string, unknown>;
    if (typeof o?.title !== "string") return null;
    milestones.push({
      title: o.title,
      sessionNumber: typeof o.sessionNumber === "number" ? o.sessionNumber : null,
      kind: o.kind === "individual" ? "individual" : "group",
    });
  }
  return {
    moduleName: r.moduleName,
    totalHours: typeof r.totalHours === "number" ? r.totalHours : null,
    sessions,
    milestones,
  };
}

export function moduleShareUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/module/${token}`;
}
