/**
 * US-150 : facturation simple. Marie fait sa facture elle-même, la dépose, puis coche « Envoyée »
 * et « Payée ». Le statut se déduit du fichier déposé et de l'état du module (`iceberg_state`).
 * Fonctions pures. Le code Factur-X / YNOV complet reste en place, derrière un repli.
 */
import { advanceTo, isAtLeast, type IcebergState } from "@/lib/ynov/iceberg";

export type SimpleInvoiceStatus = "to_deposit" | "to_send" | "sent" | "paid";

export const SIMPLE_STATUS_LABELS: Record<SimpleInvoiceStatus, string> = {
  to_deposit: "Pas de facture déposée",
  to_send: "À envoyer",
  sent: "En attente de paiement",
  paid: "Payée",
};

/** Payée avant envoyée avant fichier déposé : la case cochée prime sur le reste. */
export function simpleInvoiceStatus(input: {
  hasFile: boolean;
  state: IcebergState;
}): SimpleInvoiceStatus {
  if (isAtLeast(input.state, "paid")) return "paid";
  if (isAtLeast(input.state, "invoice_sent")) return "sent";
  return input.hasFile ? "to_send" : "to_deposit";
}

export const isSent = (state: IcebergState) => isAtLeast(state, "invoice_sent");
export const isPaid = (state: IcebergState) => isAtLeast(state, "paid");

export type InvoiceBox = "sent" | "paid";

/**
 * Nouvel état du module quand Marie coche ou décoche une case. Cocher avance (jamais en arrière) ;
 * décocher « Payée » revient à « envoyée », décocher « Envoyée » à « facture à générer »
 * (et décoche aussi « Payée » : on ne peut pas être payée sans avoir envoyé).
 */
export function stateAfterToggle(
  state: IcebergState,
  box: InvoiceBox,
  checked: boolean,
): IcebergState {
  if (checked) return advanceTo(state, box === "paid" ? "paid" : "invoice_sent");
  if (box === "paid") return state === "paid" ? "invoice_sent" : state;
  return isSent(state) ? "invoice_ready" : state;
}

/** Dates enregistrées après un changement : décocher efface la date (et celle de paiement avec l'envoi). */
export function datesAfterToggle(
  dates: { sentOn: string | null; paidOn: string | null },
  box: InvoiceBox,
  checked: boolean,
  date: string,
): { sentOn: string | null; paidOn: string | null } {
  if (box === "sent") {
    return checked ? { ...dates, sentOn: date } : { sentOn: null, paidOn: null };
  }
  return checked ? { sentOn: dates.sentOn ?? date, paidOn: date } : { ...dates, paidOn: null };
}

/** Date AAAA-MM-JJ valide, sinon `fallback` (date du jour par défaut). */
export function validDate(input: string | null | undefined, fallback: string): string {
  return input && /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(Date.parse(input))
    ? input
    : fallback;
}

/** « envoyée le 03/06 », « payée le 28/05 » ; vide sans date. */
export function dateNote(label: "envoyée" | "payée", iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${label} le ${d}/${m}` : "";
}
