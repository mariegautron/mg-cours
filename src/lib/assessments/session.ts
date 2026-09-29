/** Délai sans modification avant l'enregistrement automatique d'une copie. */
export const AUTOSAVE_DELAY_MS = 1500;

export interface CopyStatus {
  corrected: boolean;
  dirty: boolean;
}

export interface CorrectionProgress {
  done: number;
  total: number;
  /** Ex. « 12/30 corrigées » (« 1/1 corrigée » au singulier). */
  label: string;
  /** Nombre de copies avec des modifications non enregistrées. */
  dirty: number;
}

/** Avancement de la correction : copies corrigées sur total, et copies à enregistrer. */
export function correctionProgress(statuses: readonly CopyStatus[]): CorrectionProgress {
  const total = statuses.length;
  const done = statuses.filter((s) => s.corrected).length;
  return {
    done,
    total,
    label: `${done}/${total} ${done > 1 ? "corrigées" : "corrigée"}`,
    dirty: statuses.filter((s) => s.dirty).length,
  };
}

/** Copie voisine dans l'ordre d'affichage (`null` aux extrémités ou si `current` est inconnu). */
export function neighborId(
  ids: readonly string[],
  current: string,
  direction: -1 | 1,
): string | null {
  const index = ids.indexOf(current);
  if (index === -1) return null;
  return ids[index + direction] ?? null;
}

/**
 * Enregistrer automatiquement seulement s'il y a des modifications, qu'aucun enregistrement n'est en
 * cours et que la copie est enregistrable (une note directe vide ne l'est pas).
 */
export function shouldAutosave(state: { dirty: boolean; pending: boolean; ready: boolean }) {
  return state.dirty && !state.pending && state.ready;
}

/** Empreinte stable de la saisie d'une copie : différente de la dernière enregistrée = à enregistrer. */
export function formSnapshot(parts: readonly unknown[]): string {
  return JSON.stringify(parts);
}

export interface ObservationLine {
  id: string;
  studentId: string;
  studentName: string;
  tag: string;
  note: string | null;
  createdAt: string;
}

/**
 * Observations à consulter avec une copie : celles de l'étudiant·e, ou de tous les membres pour une note
 * de groupe. Les plus récentes d'abord. Consultation seulement : elles ne sortent jamais de l'application.
 */
export function observationsForCopy(
  memberIds: readonly string[],
  observations: readonly ObservationLine[],
): ObservationLine[] {
  const wanted = new Set(memberIds);
  return observations
    .filter((o) => wanted.has(o.studentId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
