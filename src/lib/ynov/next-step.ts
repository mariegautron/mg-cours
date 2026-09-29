/**
 * US-72 : « Prochaine étape » d'un module, calculée depuis les blocages réels (progression envoyée,
 * notes, documents administratifs, données de facturation) et non depuis un état iceberg saisi.
 * Fonctions pures.
 */
import {
  invoiceBlockers,
  missingInvoiceData,
  OUTLINE_NOT_SENT,
  REQUIRED_ADMIN_DOCS,
  type InvoiceContext,
} from "./invoice";

export type InvoiceStatus = "draft" | "ready" | "sent" | "paid";

export interface NextStep {
  /** Phrase complète : « Prochaine étape : envoyer la progression pédagogique ». */
  label: string;
  /** `true` quand plus rien n'est à faire (facture payée). */
  done: boolean;
  /** Toutes les raisons qui bloquent encore la facture (processus, puis données manquantes). */
  reasons: string[];
}

const PREFIX = "Prochaine étape : ";

/** Action à faire pour lever un blocage de processus, dans l'ordre du workflow YNOV. */
function actionFor(reason: string): string {
  if (reason === OUTLINE_NOT_SENT) return "envoyer la progression pédagogique";
  if (reason.startsWith("Nombre de notes insuffisant")) {
    const counts = /\((\d+)\/(\d+) requises\)/.exec(reason);
    return counts
      ? `saisir les notes manquantes (${counts[1]}/${counts[2]} requises)`
      : "saisir les notes manquantes";
  }
  const doc = REQUIRED_ADMIN_DOCS.find((d) => reason === `Document manquant : ${d.label}.`);
  if (doc) return `cocher le document administratif « ${doc.label} »`;
  return "lever les blocages";
}

/**
 * Prochaine étape d'un module : facture déjà émise (statut), sinon premier blocage réel, sinon
 * données de facturation à compléter, sinon génération de la facture.
 */
export function nextStep(ctx: InvoiceContext, invoice: { status: InvoiceStatus } | null): NextStep {
  if (invoice) {
    if (invoice.status === "paid") return { label: "Facture payée", done: true, reasons: [] };
    if (invoice.status === "sent") {
      return { label: `${PREFIX}suivre le paiement de la facture`, done: false, reasons: [] };
    }
    return { label: `${PREFIX}envoyer la facture`, done: false, reasons: [] };
  }

  const process = invoiceBlockers(ctx);
  const missing = missingInvoiceData(ctx);
  const reasons = [...process, ...missing];

  if (process.length) return { label: `${PREFIX}${actionFor(process[0])}`, done: false, reasons };
  if (missing.length) {
    const s = missing.length > 1 ? "s" : "";
    return {
      label: `${PREFIX}compléter les informations de facturation (${missing.length} manquante${s})`,
      done: false,
      reasons,
    };
  }
  return { label: `${PREFIX}générer la facture`, done: false, reasons };
}
