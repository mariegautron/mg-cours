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
  /** Rôle dans le projet fil rouge (jalon, oral, individuelle) ; absent hors projet. */
  project_role?: "milestone" | "oral" | "individual" | null;
  /** Évaluation d'un projet fil rouge (donne le « lancement » à la première séance). */
  project_id?: string | null;
  /** Rendu attendu (texte destiné aux étudiant·es), repris seulement si le sujet n'est pas « à construire ». */
  deliverable_md?: string | null;
  prep_status?: string | null;
}

export type MilestoneKind = "group" | "individual";

export interface FriseSession {
  number: number;
  /** AAAA-MM-JJ ou null. */
  date: string | null;
  period: "morning" | "afternoon" | null;
  title: string;
}

export type MilestoneRole = "milestone" | "oral" | "individual";

export interface FriseMilestone {
  title: string;
  /** Numéro de la séance où il a lieu ; null si non rattaché. */
  sessionNumber: number | null;
  kind: MilestoneKind;
  /** Rôle dans le projet fil rouge ; `null` hors projet. */
  role: MilestoneRole | null;
  /** Première ligne du rendu attendu (texte étudiant·es) ; `null` si absent ou sujet à construire. */
  deliverable: string | null;
}

export interface Frise {
  moduleName: string;
  totalHours: number | null;
  sessions: FriseSession[];
  milestones: FriseMilestone[];
  /** Numéro de la séance de lancement du projet (la première) ; `null` sans projet fil rouge. */
  launchSession: number | null;
}

/** Première ligne utile d'un texte (puces et titres retirés), coupée à 160 caractères. */
export function firstLine(text: string | null | undefined): string | null {
  const line =
    (text ?? "")
      .split("\n")
      .map((l) =>
        l
          .replace(/^\s*(?:[-*+]|\d+[.)]|#+)\s*/, "")
          .replace(/\*\*/g, "")
          .trim(),
      )
      .find(Boolean) ?? "";
  if (!line) return null;
  return line.length > 160 ? `${line.slice(0, 159)}…` : line;
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
  const regular = input.assessments.filter((a) => !a.makeup_of_id);
  const milestones: FriseMilestone[] = regular
    .map((a) => ({
      title: a.title,
      sessionNumber: a.course_id ? (numberById.get(a.course_id) ?? null) : null,
      kind: (a.is_group_grade ? "group" : "individual") as MilestoneKind,
      role: a.project_role ?? null,
      // Le rendu attendu ne sort que d'un sujet prêt ou fourni : un sujet « à construire » reste privé.
      deliverable:
        a.prep_status && a.prep_status !== "to_build" ? firstLine(a.deliverable_md) : null,
    }))
    .sort((a, b) => (a.sessionNumber ?? 999) - (b.sessionNumber ?? 999));
  const hasProject = regular.some((a) => a.project_id);
  return {
    moduleName: input.moduleName,
    totalHours: input.totalHours,
    sessions,
    milestones,
    launchSession: hasProject && sessions.length ? 1 : null,
  };
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
      role: o.role === "milestone" || o.role === "oral" || o.role === "individual" ? o.role : null,
      deliverable: typeof o.deliverable === "string" ? o.deliverable : null,
    });
  }
  return {
    moduleName: r.moduleName,
    totalHours: typeof r.totalHours === "number" ? r.totalHours : null,
    sessions,
    milestones,
    launchSession: typeof r.launchSession === "number" ? r.launchSession : null,
  };
}

export function moduleShareUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/module/${token}`;
}

/** « Séance 3 · Backlog » ; sans titre propre (« Séance 3 » par défaut) : « Séance 3 » seul. */
export function sessionHeading(s: { number: number; title: string }): string {
  const t = s.title.trim();
  return !t || /^séance\s*\d+$/i.test(t) ? `Séance ${s.number}` : `Séance ${s.number} · ${t}`;
}

/** Libellé court d'un jalon, avec son rôle : « Jalon 1 : rendu », « Oral de fin de projet »… */
export function milestoneLabel(m: FriseMilestone): string {
  if (m.role === "oral") return "Oral de fin de projet";
  if (m.role === "individual") return "Évaluation individuelle";
  return m.title;
}

export interface SessionEvent {
  kind: "launch" | "group" | "individual";
  label: string;
}

/** Ce qui se passe à chaque séance : lancement du projet, rendus et notes, pour la vue étudiant·e. */
export function sessionEvents(frise: Frise): Map<number, SessionEvent[]> {
  const events = new Map<number, SessionEvent[]>();
  const add = (n: number, e: SessionEvent) => events.set(n, [...(events.get(n) ?? []), e]);
  if (frise.launchSession) add(frise.launchSession, { kind: "launch", label: "Lancement" });
  for (const m of frise.milestones) {
    if (m.sessionNumber === null) continue;
    const kindLabel = m.kind === "group" ? "note de groupe" : "note individuelle";
    add(m.sessionNumber, {
      kind: m.kind,
      label:
        m.role === "oral"
          ? "Oral · groupe"
          : m.role === "individual"
            ? "Évaluation individuelle"
            : `${m.title} · ${kindLabel}`,
    });
  }
  return events;
}

/** Prochain rendu à partir d'aujourd'hui (AAAA-MM-JJ) : la première note dont la séance n'est pas passée. */
export function nextMilestone(frise: Frise, today: string): FriseMilestone | null {
  const dateOf = new Map(frise.sessions.map((s) => [s.number, s.date]));
  const upcoming = frise.milestones.filter((m) => {
    if (m.sessionNumber === null) return false;
    const d = dateOf.get(m.sessionNumber);
    return !d || d >= today;
  });
  return upcoming[0] ?? null;
}

export type BandKind = "launch" | "group" | "individual";

export interface Band {
  key: string;
  label: string;
  sub: string;
  kind: BandKind;
  /** Colonnes de la frise (1-based, bornes comprises). */
  start: number;
  end: number;
  /** Ligne d'affichage : deux bandes qui se chevauchent ne partagent jamais une ligne. */
  row: number;
}

/**
 * Bandes de la frise projetée : le lancement du projet (séance de départ) et chaque note, qui se
 * termine à sa séance et s'étend sur deux colonnes. Les bandes qui se chevauchent passent à la
 * ligne suivante ; les notes individuelles ne vont jamais sur la ligne des notes de groupe.
 */
export function bandLayout(frise: Frise): Band[] {
  const n = frise.sessions.length;
  if (n === 0) return [];
  const clamp = (v: number) => Math.min(n, Math.max(1, v));
  const raw: Omit<Band, "row">[] = [];
  if (frise.launchSession) {
    const start = clamp(frise.launchSession);
    raw.push({
      key: "launch",
      label: "Lancement du projet",
      sub: `Séance ${start}`,
      kind: "launch",
      start,
      end: clamp(start + 1),
    });
  }
  frise.milestones.forEach((m, i) => {
    if (m.sessionNumber === null) return;
    const end = clamp(m.sessionNumber);
    raw.push({
      key: `m${i}`,
      label: m.role === "milestone" ? `${m.title} : rendu` : milestoneLabel(m),
      sub: `Séance ${m.sessionNumber} · ${m.kind === "group" ? "note de groupe" : "note individuelle"}`,
      kind: m.kind,
      start: clamp(end - 1),
      end,
    });
  });
  const rows: { end: number; individual: boolean }[][] = [];
  const out: Band[] = [];
  for (const b of raw.sort((a, c) => a.start - c.start || a.end - c.end)) {
    const individual = b.kind === "individual";
    let row = rows.findIndex(
      (r) => r.every((x) => x.end < b.start) && r.every((x) => x.individual === individual),
    );
    if (row === -1) {
      rows.push([]);
      row = rows.length - 1;
    }
    rows[row].push({ end: b.end, individual });
    out.push({ ...b, row });
  }
  return out;
}
