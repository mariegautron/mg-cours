import type { Enums } from "@/types/db";

/**
 * Workflow « iceberg » YNOV — 13 étapes, dans l'ordre. Si une étape manque,
 * la facture est bloquée par l'école. Cf. docs/YNOV-RULES.md §2.
 */
export const ICEBERG_STATES = [
  "fiche_received",
  "module_created",
  "outline_generated",
  "plan_on_moodle",
  "materials_on_moodle",
  "outline_sent",
  "subjects_on_moodle",
  "grades_in_hp",
  "grades_in_mg",
  "admin_docs_ok",
  "invoice_ready",
  "invoice_sent",
  "paid",
] as const satisfies readonly Enums<"iceberg_state">[];

export type IcebergState = (typeof ICEBERG_STATES)[number];

export const ICEBERG_LABELS: Record<IcebergState, string> = {
  fiche_received: "Fiche reçue",
  module_created: "Module créé",
  outline_generated: "Trame générée",
  plan_on_moodle: "Plan déposé sur Moodle",
  materials_on_moodle: "Supports déposés sur Moodle",
  outline_sent: "Trame envoyée",
  subjects_on_moodle: "Sujets/grilles déposés sur Moodle",
  grades_in_hp: "Notes saisies sur Hyperplanning",
  grades_in_mg: "Notes saisies dans MG COURS",
  admin_docs_ok: "Documents administratifs OK",
  invoice_ready: "Facture à générer",
  invoice_sent: "Facture envoyée",
  paid: "Payée",
};

export function stateIndex(state: IcebergState): number {
  return ICEBERG_STATES.indexOf(state);
}

/** `true` si `state` a atteint (ou dépassé) `target` dans le workflow. */
export function isAtLeast(state: IcebergState, target: IcebergState): boolean {
  return stateIndex(state) >= stateIndex(target);
}

/** La trame a été marquée envoyée dès que le module a dépassé `outline_sent`. */
export function isOutlineSent(state: IcebergState): boolean {
  return isAtLeast(state, "outline_sent");
}

export function nextState(state: IcebergState): IcebergState | null {
  const i = stateIndex(state);
  return i < ICEBERG_STATES.length - 1 ? ICEBERG_STATES[i + 1] : null;
}
