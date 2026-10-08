import { qcmKey } from "@/lib/present/plan";

/**
 * Mini-QCM projetés à la fin d'une séance : les questions liées (`resource_question`) aux
 * ressources projetées, regroupées par fiche. Fonctions pures : sélection, volume, correction.
 * Une question n'est jamais montrée avec sa correction : deux diapositives distinctes.
 */

export type QcmQuestionType =
  "single_choice" | "multiple_choice" | "true_false" | "numerical" | "open";

export interface QcmChoice {
  id: string;
  position: number;
  text: string;
  isCorrect: boolean;
  fraction: number;
  feedback: string;
}

export interface QcmQuestion {
  id: string;
  name: string;
  type: QcmQuestionType;
  /** Markdown. */
  statement: string;
  generalFeedback: string;
  category: string;
  archived: boolean;
  numericValue: number | null;
  numericTolerance: number | null;
  /** Dans l'ordre de la base (déjà mélangé volontairement : ne jamais trier par exactitude). */
  choices: QcmChoice[];
}

export interface QcmGroup {
  resourceId: string;
  /** Clé « Pour moi » : `qcm:<id de la fiche>`. */
  key: string;
  title: string;
  /** Questions projetables de la fiche, avant limite. */
  available: number;
  shown: QcmQuestion[];
}

/** Questions projetées par fiche quand rien n'est choisi. */
export const QCM_DEFAULT_LIMIT = 5;
/** Choix proposés dans « Avant de commencer » ; `null` = toutes les questions. */
export const QCM_LIMIT_OPTIONS: readonly (number | null)[] = [3, 5, 8, null];
const QCM_LIMIT_MAX = 50;

/** Banque de l'évaluation individuelle : jamais projetée. */
const EXCLUDED_CATEGORIES = new Set(["scrum"]);

/** `?qcm=5` ou `?qcm=all` ; valeur absente ou étrange = réglage par défaut. */
export function parseQcmLimit(param: string | string[] | undefined): number | null {
  const raw = (Array.isArray(param) ? param[0] : param)?.trim().toLowerCase();
  if (raw === "all") return null;
  if (raw && /^\d{1,2}$/.test(raw)) {
    const n = Number(raw);
    if (n >= 1 && n <= QCM_LIMIT_MAX) return n;
  }
  return QCM_DEFAULT_LIMIT;
}

export const serializeQcmLimit = (limit: number | null): string =>
  limit === null ? "all" : String(limit);

/** Paramètre d'adresse du réglage, ou `null` quand c'est la valeur par défaut. */
export function qcmLimitParam(limit: number | null): string | null {
  return limit === QCM_DEFAULT_LIMIT ? null : `qcm=${serializeQcmLimit(limit)}`;
}

/** Ajoute le réglage au lien d'une des deux fenêtres (rien si c'est la valeur par défaut). */
export function withQcmLimit(href: string, limit: number | null): string {
  const param = qcmLimitParam(limit);
  if (!param) return href;
  return `${href}${href.includes("?") ? "&" : "?"}${param}`;
}

export const qcmLimitLabel = (limit: number | null): string =>
  limit === null ? "Toutes" : `${limit} par fiche`;

/**
 * Une question se projette si elle a une réponse à montrer : pas de réponse ouverte, pas la
 * banque de l'évaluation individuelle, pas archivée, et un énoncé avec une bonne réponse.
 */
export function isProjectableQuestion(q: QcmQuestion): boolean {
  if (q.archived || q.type === "open") return false;
  if (EXCLUDED_CATEGORIES.has(q.category.trim().toLowerCase())) return false;
  if (!q.statement.trim()) return false;
  if (q.type === "numerical") return q.numericValue !== null;
  return q.choices.length >= 2 && q.choices.some((c) => c.isCorrect);
}

export function questionTypeLabel(q: Pick<QcmQuestion, "type" | "choices">): string {
  switch (q.type) {
    case "multiple_choice":
      return "Plusieurs réponses possibles";
    case "true_false":
      return "Vrai ou faux";
    case "numerical":
      return "Réponse numérique";
    default:
      return "Une seule réponse";
  }
}

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const choiceLetter = (index: number): string => letters[index] ?? String(index + 1);

const formatNumber = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 6 });

/** « 42 » ou « 42 (à ± 0,5 près) » pour une question numérique. */
export function numericAnswerLabel(value: number, tolerance: number | null): string {
  return tolerance && tolerance > 0
    ? `${formatNumber(value)} (à ± ${formatNumber(tolerance)} près)`
    : formatNumber(value);
}

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

/**
 * Regroupe les questions liées aux ressources projetées, dans l'ordre du déroulé. Une question
 * liée à deux fiches de la séance ne se projette qu'une fois (sous la première). Une fiche
 * « Pour moi » (clé dans `hidden`) ou sans question projetable n'a pas de groupe.
 */
export function buildQcmGroups({
  resources,
  links,
  questions,
  limit,
  hidden = new Set<string>(),
}: {
  resources: readonly { id: string; title: string }[];
  /** Couples (fiche, question), dans l'ordre de liaison. */
  links: readonly { resourceId: string; questionId: string }[];
  questions: ReadonlyMap<string, QcmQuestion>;
  limit: number | null;
  hidden?: ReadonlySet<string>;
}): QcmGroup[] {
  const seen = new Set<string>();
  const groups: QcmGroup[] = [];
  for (const resource of resources) {
    const own = links
      .filter((l) => l.resourceId === resource.id)
      .map((l) => questions.get(l.questionId))
      .filter((q): q is QcmQuestion => !!q && isProjectableQuestion(q) && !seen.has(q.id))
      // Doublons de liaison écartés ; ordre stable : par nom (« Q2 » avant « Q10 »), puis par liaison.
      .filter((q, i, all) => all.findIndex((x) => x.id === q.id) === i)
      .map((q, order) => ({ q, order }))
      .sort((a, b) => collator.compare(a.q.name, b.q.name) || a.order - b.order)
      .map((x) => x.q);
    own.forEach((q) => seen.add(q.id));
    if (own.length === 0 || hidden.has(qcmKey(resource.id))) continue;
    groups.push({
      resourceId: resource.id,
      key: qcmKey(resource.id),
      title: resource.title,
      available: own.length,
      shown: limit === null ? own : own.slice(0, limit),
    });
  }
  return groups;
}

/** Nombre total de questions projetées, toutes fiches confondues. */
export const qcmTotal = (groups: readonly QcmGroup[]): number =>
  groups.reduce((n, g) => n + g.shown.length, 0);

export type ChoiceVerdict = "correct" | "wrong";

/** Verdict d'un choix à la correction : bonne réponse ou non (jamais de tri : l'ordre est voulu). */
export const choiceVerdict = (c: Pick<QcmChoice, "isCorrect">): ChoiceVerdict =>
  c.isCorrect ? "correct" : "wrong";

/** « Question 3 sur 5 » : la position dans la fiche (à partir de 1). */
export const questionCounter = (index: number, total: number): string =>
  `Question ${index + 1} sur ${total}`;

/** « 5 questions sur 12 » quand la limite en écarte, sinon « 5 questions ». */
export function groupSummary(group: Pick<QcmGroup, "available" | "shown">): string {
  const n = group.shown.length;
  const word = (k: number) => `question${k > 1 ? "s" : ""}`;
  return n < group.available ? `${n} ${word(n)} sur ${group.available}` : `${n} ${word(n)}`;
}
