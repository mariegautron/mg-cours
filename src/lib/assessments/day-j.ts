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
  const mismatch = !!(i.date && i.courseDate && i.date !== i.courseDate);
  add(
    "date",
    !!i.date && !mismatch,
    "Date cohérente avec la séance",
    i.date ? "La date ne correspond pas à la séance rattachée." : "Renseigne la date.",
    edit,
  );
  if (!isQcm && !isOral && kind === "files") {
    add("where", !!i.whereToSubmit?.trim(), "Où rendre", "Indique où rendre le travail.");
    add(
      "files",
      hasFiles(i.files),
      "Fichiers joints",
      "Ajoute les fichiers du sujet si besoin.",
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
    add(
      "qcm-open",
      i.qcm.opened,
      "QCM publié ou ouverture programmée",
      "Publie le QCM ou programme l’ouverture.",
      q,
    );
  }
  const missing = items.filter((x) => !x.ok);
  return { items, missing, allReady: missing.length === 0 };
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
