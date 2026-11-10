/**
 * Espace de correction d'un oral (brouillon en direct, puis note écrite). Fonctions pures.
 *
 * - Les paliers d'un critère s'affichent en lettres, A (le plus haut) à D. Aucun point dans les
 *   vues de travail : les points n'apparaissent qu'au récapitulatif d'écriture de la note.
 * - Chaque champ porte sa version : un enregistrement n'écrase jamais une saisie plus récente.
 * - La note écrite est une photo ; si une lettre change ensuite, elle est « à réécrire ».
 */
import type { Attendance } from "@/lib/assessments/attendance";
import { computeTotals, gradingProgress, type ScoringCriterion } from "@/lib/assessments/scoring";

export const LETTERS = ["A", "B", "C", "D"] as const;
export type Letter = (typeof LETTERS)[number];

export function isLetter(v: unknown): v is Letter {
  return typeof v === "string" && (LETTERS as readonly string[]).includes(v);
}

export interface OralLevel {
  points: number;
  description: string;
}

export interface OralCriterion {
  id: string;
  label: string;
  weight: number;
  axisId: string | null;
  isBonus: boolean;
  /** Paliers du plus haut au plus bas. */
  levels: OralLevel[];
}

/** Lettre du palier `index` (0 : le plus haut). */
export function letterOf(index: number): Letter | null {
  return LETTERS[index] ?? null;
}

/** Palier d'un critère pour une lettre (`null` si ce critère n'a pas autant de paliers). */
export function levelFor(criterion: OralCriterion, letter: Letter): OralLevel | null {
  return criterion.levels[LETTERS.indexOf(letter)] ?? null;
}

/** Lettres reprises d'une note existante : le palier dont les points correspondent exactement. */
export function lettersFromScores(
  criteria: readonly OralCriterion[],
  scores: unknown,
): Record<string, Letter> {
  const out: Record<string, Letter> = {};
  if (typeof scores !== "object" || scores === null || Array.isArray(scores)) return out;
  const map = scores as Record<string, unknown>;
  for (const c of criteria) {
    const v = map[c.id];
    if (typeof v !== "number") continue;
    const index = c.levels.findIndex((l) => l.points === v);
    const letter = index === -1 ? null : letterOf(index);
    if (letter) out[c.id] = letter;
  }
  return out;
}

/** Points par critère d'après les lettres (critères sans lettre ignorés). */
export function scoresFromLetters(
  criteria: readonly OralCriterion[],
  letters: Readonly<Record<string, string | undefined>>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of criteria) {
    const letter = letters[c.id];
    if (!isLetter(letter)) continue;
    const level = levelFor(c, letter);
    if (level) out[c.id] = level.points;
  }
  return out;
}

const scoring = (criteria: readonly OralCriterion[]): ScoringCriterion[] =>
  criteria.map((c) => ({ id: c.id, weight: c.weight, axisId: c.axisId, isBonus: c.isBonus }));

export interface DraftState {
  letters: Record<string, string>;
  attendance: Record<string, Attendance | undefined>;
}

/** Avancement du brouillon : critères lettrés sur le total (hors bonus), validés d'office compris. */
export function draftProgress(
  criteria: readonly OralCriterion[],
  letters: Readonly<Record<string, string | undefined>>,
  autoValidatedIds: readonly string[] = [],
) {
  return gradingProgress(scoring(criteria), scoresFromLetters(criteria, letters), autoValidatedIds);
}

/** Ce qui empêche d'écrire la note, en une phrase par manque (vide : on peut écrire). */
export function missingForWrite(
  criteria: readonly OralCriterion[],
  letters: Readonly<Record<string, string | undefined>>,
  members: readonly { id: string; name: string }[],
  attendance: Readonly<Record<string, Attendance | undefined>>,
  autoValidatedIds: readonly string[] = [],
): string[] {
  const missing: string[] = [];
  const noLetter = criteria.filter(
    (c) => !c.isBonus && !autoValidatedIds.includes(c.id) && !isLetter(letters[c.id]),
  );
  if (noLetter.length > 0) {
    missing.push(`Il manque une lettre : ${noLetter.map((c) => c.label).join(", ")}.`);
  }
  const noPresence = members.filter((m) => !attendance[m.id]);
  if (noPresence.length > 0) {
    missing.push(`Présence à poser : ${noPresence.map((m) => m.name).join(", ")}.`);
  }
  return missing;
}

export interface Recap {
  perCriterion: {
    id: string;
    label: string;
    letter: Letter | null;
    points: number | null;
    max: number;
  }[];
  total: number;
  maxScore: number;
  capped: boolean;
}

/** Récapitulatif : lettres, points par critère et total (même calcul que partout : ramené au barème et plafonné). */
export function recap(
  criteria: readonly OralCriterion[],
  letters: Readonly<Record<string, string | undefined>>,
  options: { autoValidatedIds?: readonly string[]; maxScore: number | null },
): Recap {
  const scores = scoresFromLetters(criteria, letters);
  const totals = computeTotals(scoring(criteria), scores, {
    autoValidatedIds: options.autoValidatedIds,
    maxScore: options.maxScore,
  });
  return {
    perCriterion: criteria.map((c) => {
      const letter = letters[c.id];
      const auto = !c.isBonus && (options.autoValidatedIds ?? []).includes(c.id);
      return {
        id: c.id,
        label: c.label,
        letter: isLetter(letter) ? letter : null,
        points: auto ? c.weight : (scores[c.id] ?? null),
        max: c.weight,
      };
    }),
    total: totals.value,
    maxScore: totals.maxScore,
    capped: totals.capped,
  };
}

/**
 * Note de chaque membre d'après la présence.
 * - `group_all` (oraux créés avec ce lot) : tout le groupe reçoit la note du groupe, absent·es compris ;
 * - `legacy` (oraux déjà notés) : règle d'origine, absent·e non prévenu·e 0, excusé·e selon l'école.
 */
export function memberValues(
  groupValue: number,
  maxScore: number,
  members: readonly { id: string }[],
  attendance: Readonly<Record<string, Attendance | undefined>>,
  rule: "group_all" | "legacy",
  schoolRule: "keep_group_grade" | "makeup",
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const m of members) {
    const a = attendance[m.id] ?? "present";
    if (rule === "group_all") out[m.id] = Math.min(groupValue, maxScore);
    else if (a === "absent_unexcused") out[m.id] = 0;
    else if (a === "absent_excused" && schoolRule === "makeup") out[m.id] = null;
    else out[m.id] = Math.min(groupValue, maxScore);
  }
  return out;
}

// ── Versions par champ ──────────────────────────────────────────────────────

/** Identifiant d'un champ : « letter:<critère> », « note:<critère> », « pad », « person:<étudiant·e> », « presence:<étudiant·e> ». */
export type FieldId = string;

export interface FieldSaveInput {
  /** Version du champ quand la saisie a commencé. */
  baseVersion: number;
  value: string;
}

export type FieldSaveOutcome =
  | { kind: "write"; version: number }
  | { kind: "same"; version: number }
  | { kind: "conflict"; version: number; theirs: string };

/**
 * Décide d'un enregistrement de champ. Si la version stockée est celle que Marie avait vue, on
 * écrit (version + 1). Si le champ a changé ailleurs mais contient déjà la même valeur, rien à faire.
 * Sinon c'est un conflit : on montre les deux versions et elle choisit.
 */
export function decideFieldSave(
  stored: { value: string; version: number },
  input: FieldSaveInput,
): FieldSaveOutcome {
  if (stored.version === input.baseVersion) return { kind: "write", version: stored.version + 1 };
  if (stored.value === input.value) return { kind: "same", version: stored.version };
  return { kind: "conflict", version: stored.version, theirs: stored.value };
}

// ── Photo de la note écrite ─────────────────────────────────────────────────

export interface WrittenSnapshot {
  letters: Record<string, string>;
  attendance: Record<string, string>;
  absence_rule: "group_all" | "legacy";
  value: number;
  per_student: Record<string, number | null>;
}

function sameMap(a: Record<string, string>, b: Record<string, string>): boolean {
  const ka = Object.keys(a).filter((k) => a[k] !== "");
  const kb = Object.keys(b).filter((k) => b[k] !== "");
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

/**
 * Présences effectives d'un espace : la valeur enregistrée, sinon « présent » pour un oral repris
 * d'une note existante. Règle unique, utilisée par l'écran de l'oral, l'écriture de la note et le
 * calcul « à réécrire » côté serveur (sinon l'écran dit « Note écrite » et le serveur « à réécrire »).
 */
export function effectiveAttendance(
  stored: Readonly<Record<string, string | undefined>>,
  memberIds: readonly string[],
  fromExisting: boolean,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of memberIds) {
    const v = stored[id];
    if (v) out[id] = v;
    else if (fromExisting) out[id] = "present";
  }
  return out;
}

/**
 * « À réécrire » : une lettre a changé depuis la photo. Rien n'est modifié seul. La présence n'en
 * fait plus partie : elle est écrite tout de suite sur la copie (seule source).
 */
export function needsRewrite(
  written: WrittenSnapshot | null,
  letters: Record<string, string>,
): boolean {
  if (!written) return false;
  return !sameMap(written.letters, letters);
}

export function parseWritten(raw: unknown): WrittenSnapshot | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const w = raw as Record<string, unknown>;
  if (typeof w.value !== "number" || typeof w.letters !== "object" || w.letters === null)
    return null;
  return w as unknown as WrittenSnapshot;
}

/** Une ligne par personne : ancienne note, nouvelle note, et la règle qui change quelque chose. */
export interface DiffLine {
  studentId: string;
  name: string;
  before: number | null;
  after: number | null;
  attendance: Attendance;
  changed: boolean;
}

export function diffLines(
  members: readonly { id: string; name: string }[],
  before: Readonly<Record<string, number | null>>,
  after: Readonly<Record<string, number | null>>,
  attendance: Readonly<Record<string, Attendance | undefined>>,
): DiffLine[] {
  return members.map((m) => ({
    studentId: m.id,
    name: m.name,
    before: before[m.id] ?? null,
    after: after[m.id] ?? null,
    attendance: attendance[m.id] ?? "present",
    changed: (before[m.id] ?? null) !== (after[m.id] ?? null),
  }));
}
