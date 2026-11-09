/**
 * « Prêt pour le jour J ? » : liste de contrôle d'une évaluation à venir. Fonctions pures : on
 * transforme ce qui est déjà chargé en points prêts / manquants, chacun avec un lien pour le
 * compléter. Un point dont la donnée est inconnue (`undefined`) n'est pas affiché.
 */
import { examKindOf } from "@/lib/assessments/exam-kind";
import { canPresent, subjectSections, type PrepStatus } from "@/lib/assessments/subject";

export interface DayJInput {
  moduleId: string;
  id: string;
  title: string;
  date: string | null;
  courseId: string | null;
  /** Date de la séance rattachée. */
  courseDate?: string | null;
  prepStatus: PrepStatus;
  objective: string | null;
  subject: string | null;
  deliverableMd: string | null;
  evaluatedMd: string | null;
  gradingGridId: string | null;
  groupCount: number;
  isGroupGrade: boolean;
  examKind: string | null;
  type: string | null;
  whereToSubmit: string | null;
  /** « app » : les étudiant·es rendent dans l'application, « Où rendre » est alors rempli. */
  submissionMode?: string | null;
  files: unknown;
  isOral?: boolean;
  /** Sujet publié et à jour dans l'espace des étudiant·es ; `undefined` = inconnu. */
  published?: boolean;
  /** Pour un QCM : règles possibles, tirages préparés, publié ou ouverture programmée. */
  qcm?: { rulesOk: boolean; drawsPrepared: boolean; opened: boolean };
}

export interface DayJItem {
  key: string;
  ok: boolean;
  label: string;
  /** Ce qu'il reste à faire quand le point n'est pas prêt. */
  todo?: string;
  href: string;
  /** Facultatif : affiché en gris, jamais compté dans « N à compléter ». */
  optional?: boolean;
}

export interface DayJ {
  items: DayJItem[];
  missing: DayJItem[];
  allReady: boolean;
}

const hasFiles = (files: unknown) => Array.isArray(files) && files.length > 0;

export function dayJReadiness(i: DayJInput): DayJ {
  const base = `/modules/${i.moduleId}/assessments/${i.id}`;
  const edit = `${base}/edit`;
  const kind = examKindOf({ exam_kind: i.examKind, type: i.type });
  const isQcm = kind === "qcm";
  const isOral = i.isOral || kind === "oral";
  const items: DayJItem[] = [];
  const add = (key: string, ok: boolean, label: string, todo: string, href = base) =>
    items.push({ key, ok, label, todo: ok ? undefined : todo, href });
  const info = (key: string, ok: boolean, label: string, href = base) =>
    items.push({ key, ok, label, href, optional: true });

  add("status", canPresent(i.prepStatus), "Sujet prêt", "Passe le sujet en « Prête ».");
  add(
    "frame",
    subjectSections({
      objective: i.objective,
      subject: i.subject,
      deliverable_md: i.deliverableMd,
      evaluated_md: i.evaluatedMd,
    }).length > 0,
    "Consignes rédigées",
    "Rédige les consignes du sujet.",
    edit,
  );
  if (!isQcm) {
    add("grid", !!i.gradingGridId, "Grille reliée", "Relie une grille de correction.");
  }
  add(
    "groups",
    i.groupCount > 0,
    i.isGroupGrade ? "Groupes cochés" : "Groupe coché",
    "Coche au moins un groupe.",
    edit,
  );
  if (!i.courseId) {
    // Sans séance, rien ne permet de dire que la date est « cohérente ».
    add(
      "date",
      false,
      "Pas rattachée à une séance",
      "absente de la frise des étudiant·es.",
      edit,
    );
  } else {
    const mismatch = !!(i.date && i.courseDate && i.date !== i.courseDate);
    add(
      "date",
      !!i.date && !mismatch,
      "Date cohérente avec la séance",
      i.date ? "La date ne correspond pas à la séance rattachée." : "Renseigne la date.",
      edit,
    );
  }
  if (!isQcm && !isOral && kind === "files") {
    add(
      "where",
      i.submissionMode === "app" || !!i.whereToSubmit?.trim(),
      "Où rendre",
      "Indique où rendre le travail.",
    );
    const withFiles = hasFiles(i.files);
    info(
      "files",
      withFiles,
      withFiles ? "Fichiers joints" : "Aucun fichier joint, facultatif",
      edit,
    );
  }
  if (i.published !== undefined) {
    add(
      "published",
      i.published,
      "Publié dans l’espace (à jour)",
      "Mets à jour l’espace étudiant·es.",
      `/modules/${i.moduleId}/frise`,
    );
  }
  if (isQcm && i.qcm) {
    const q = `${base}/quiz`;
    add(
      "qcm-rules",
      i.qcm.rulesOk,
      "Règles de tirage possibles",
      "Corrige les règles de tirage.",
      q,
    );
    add("qcm-draws", i.qcm.drawsPrepared, "Tirages et liens préparés", "Prépare les tirages.", q);
    // Une date d'ouverture ne suffit pas : seul un QCM publié s'ouvre à la date prévue.
    add("qcm-open", i.qcm.opened, "QCM publié", "Publie le QCM.", q);
  }
  const missing = items.filter((x) => !x.ok && !x.optional);
  return { items, missing, allReady: missing.length === 0 };
}

/**
 * L'évaluation publiée dans l'espace correspond-elle encore à l'évaluation ? Une modification du
 * titre, de la date, de « Où rendre », du mode de rendu ou du sujet demande une mise à jour.
 */
export function espaceUpToDate(
  published:
    | {
        title: string;
        date: string | null;
        whereToSubmit: string | null;
        submit?: { mode: string };
        sections: { heading: string; text: string }[];
      }
    | undefined,
  current: {
    title: string;
    date: string | null;
    where_to_submit: string | null;
    submission_mode?: string | null;
    objective: string | null;
    subject: string | null;
    deliverable_md: string | null;
    evaluated_md: string | null;
  },
): boolean {
  if (!published) return false;
  const sections = subjectSections(current).map((x) => ({ heading: x.heading, text: x.text }));
  const mode = current.submission_mode === "app" ? "app" : "elsewhere";
  return (
    published.title === current.title &&
    (published.date ?? null) === (current.date?.slice(0, 10) ?? null) &&
    (published.whereToSubmit ?? "").trim() === (current.where_to_submit ?? "").trim() &&
    (!published.submit || published.submit.mode === mode) &&
    JSON.stringify(published.sections) === JSON.stringify(sections)
  );
}

/** Évaluations à venir dans `days` jours (aujourd'hui compris), triées par date. */
export function upcomingAssessments<T extends { date: string | null }>(
  list: readonly T[],
  today: string,
  days = 14,
): T[] {
  const ms = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00Z`);
  const limit = ms(today) + days * 86_400_000;
  return list
    .filter((a) => a.date && ms(a.date) >= ms(today) && ms(a.date) <= limit)
    .sort((a, b) => (a.date as string).localeCompare(b.date as string));
}
