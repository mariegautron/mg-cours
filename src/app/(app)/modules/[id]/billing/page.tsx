import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CircleDashed } from "lucide-react";

import { GenerateInvoiceButton, InvoiceActions } from "@/components/billing/invoice-actions";
import { ArchiveModuleButton } from "@/components/modules/archive-module-button";
import { Celebration } from "@/components/celebration";
import { Badge } from "@/components/ui/badge";
import { getInvoiceByModule, loadInvoiceContext } from "@/lib/invoice/queries";
import { SimpleInvoice } from "@/components/billing/simple-invoice";
import { simpleInvoiceStatus, isPaid, isSent } from "@/lib/invoice/simple";
import { getInvoiceTracking } from "@/lib/invoice/tracking-queries";
import { todayInParis } from "@/lib/modules/next-session";
import { AdminDocsChecklist } from "@/components/modules/admin-docs-checklist";
import { DocumentSlot } from "@/components/modules/module-documents";
import { getModule, getModuleDocuments } from "@/lib/modules/queries";
import { invoiceBlockers, missingInvoiceData, OUTLINE_NOT_SENT } from "@/lib/ynov/invoice";

export async function generateMetadata({
  params,
}: PageProps<"/modules/[id]/billing">): Promise<Metadata> {
  const { id } = await params;
  const mod = await getModule(id);
  return { title: mod ? `Facturation — ${mod.name}` : "Facturation" };
}

const eur = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

const STATUS_LABEL = {
  draft: "Brouillon",
  ready: "À envoyer",
  sent: "Envoyée",
  paid: "Payée",
} as const;

export default async function ModuleBillingPage({ params }: PageProps<"/modules/[id]/billing">) {
  const { id } = await params;
  const [mod, ctx, invoice, documents, tracking] = await Promise.all([
    getModule(id),
    loadInvoiceContext(id),
    getInvoiceByModule(id),
    getModuleDocuments(id),
    getInvoiceTracking(id),
  ]);
  if (!mod || !ctx) notFound();

  const blockers = invoiceBlockers(ctx);
  const missing = missingInvoiceData(ctx);
  const canGenerate = blockers.length === 0 && missing.length === 0;

  const conditions = [
    {
      ok: !blockers.includes(OUTLINE_NOT_SENT),
      label: "Progression pédagogique envoyée",
      action: { href: `/modules/${id}#progression`, label: "Marquer comme envoyée" },
    },
    {
      ok: ctx.notes.satisfied,
      label: `Notes saisies (${ctx.notes.enteredTotal}/${ctx.notes.requiredTotal} requises)`,
      action: { href: `/modules/${id}/assessments`, label: "Saisir une note" },
    },
  ];
  // Résumé en tête de page : combien de points restent, et l'action principale juste à côté.
  const points = blockers.length + missing.length;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Facturation — {mod.name}</h1>
        <p className="text-muted-foreground">
          <Link href={`/modules/${id}`} className="underline underline-offset-2">
            Retour au module
          </Link>
        </p>
      </div>

      {(invoice?.status === "paid" || mod.iceberg_state === "paid") && !mod.archived_at ? (
        // Fin du parcours iceberg : facture payée. Un état de fin sobre, avec la suite logique.
        <Celebration
          action={<ArchiveModuleButton id={id} archived={false} compact name={mod.name} />}
        >
          Module terminé. Tu peux l’archiver.
        </Celebration>
      ) : null}

      <SimpleInvoice
        moduleId={id}
        status={simpleInvoiceStatus({
          hasFile: documents.some((d) => d.kind === "external_invoice"),
          state: mod.iceberg_state,
        })}
        sent={isSent(mod.iceberg_state)}
        paid={isPaid(mod.iceberg_state)}
        sentOn={tracking.sentOn}
        paidOn={tracking.paidOn}
        datesAvailable={tracking.available}
        today={todayInParis()}
        summary={invoice ? `Facture ${invoice.number} : ${eur(invoice.amount_inc_vat)} TTC.` : null}
      >
        <DocumentSlot
          moduleId={id}
          kind="external_invoice"
          title="Ma facture (PDF)"
          hint="Dépose ici le PDF de ta facture : le fichier reste attaché au module."
          documents={documents.filter((d) => d.kind === "external_invoice")}
        />
      </SimpleInvoice>

      <details className="rounded-lg border p-4">
        <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer items-center rounded-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
          Autres options de facturation
        </summary>
        <div className="mt-4 space-y-8">
          <p className="text-muted-foreground text-sm">
            Facture électronique Factur-X conforme YNOV, avec ses conditions : elle reste
            disponible, mais tu n’en as pas besoin pour suivre ta facture.
          </p>
          {!invoice ? (
            <section
              aria-labelledby="billing-status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <h2 id="billing-status" className="text-lg font-medium">
                  {canGenerate
                    ? "Prêt à facturer ✓"
                    : `${points} point${points > 1 ? "s" : ""} à traiter`}
                </h2>
                <p id="billing-status-text" className="text-muted-foreground text-sm">
                  {canGenerate
                    ? "Tout est en place : tu peux créer la facture."
                    : "Traite-les ci-dessous : la facture se débloque ensuite."}
                </p>
              </div>
              <GenerateInvoiceButton
                moduleId={id}
                disabled={!canGenerate}
                describedBy="billing-status-text"
              />
            </section>
          ) : null}

          {invoice ? (
            <section aria-labelledby="invoice" className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="invoice" className="text-lg font-medium">
                  Facture {invoice.number}
                </h2>
                <Badge variant={invoice.status === "paid" ? "secondary" : "outline"}>
                  {STATUS_LABEL[invoice.status]}
                </Badge>
              </div>
              <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <dt className="text-muted-foreground">Émission</dt>
                <dd>{day(invoice.issued_on)}</dd>
                <dt className="text-muted-foreground">Échéance</dt>
                <dd>{invoice.due_on ? day(invoice.due_on) : "—"}</dd>
                <dt className="text-muted-foreground">Référence client</dt>
                <dd>{invoice.purchase_order_ref}</dd>
                <dt className="text-muted-foreground">Total HT</dt>
                <dd>{eur(invoice.amount_ex_vat)}</dd>
                <dt className="text-muted-foreground">TVA ({invoice.vat_rate} %)</dt>
                <dd>{eur(invoice.vat_amount)}</dd>
                <dt className="text-muted-foreground">Total TTC</dt>
                <dd className="font-medium">{eur(invoice.amount_inc_vat)}</dd>
                <dt className="text-muted-foreground">Destinataire</dt>
                <dd>{invoice.recipient_email}</dd>
                {invoice.sent_at ? (
                  <>
                    <dt className="text-muted-foreground">Envoyée le</dt>
                    <dd>{day(invoice.sent_at)}</dd>
                  </>
                ) : null}
                {invoice.paid_on ? (
                  <>
                    <dt className="text-muted-foreground">Payée le</dt>
                    <dd>{day(invoice.paid_on)}</dd>
                  </>
                ) : null}
              </dl>
              <InvoiceActions
                moduleId={id}
                invoiceId={invoice.id}
                status={invoice.status}
                number={invoice.number}
                recipientEmail={invoice.recipient_email}
                amountIncVat={invoice.amount_inc_vat}
              />
            </section>
          ) : (
            <>
              <section aria-labelledby="conditions">
                <h2 id="conditions" className="mb-3 text-lg font-medium">
                  Conditions YNOV avant facturation
                </h2>
                <ul className="space-y-1 text-sm">
                  {conditions.map((c) => (
                    <li key={c.label} className="flex items-center gap-2">
                      {c.ok ? (
                        <CircleCheck aria-hidden className="text-success size-4" />
                      ) : (
                        <CircleDashed aria-hidden className="text-warning size-4" />
                      )}
                      <span>
                        {c.label}
                        <span className="sr-only">{c.ok ? " : fait" : " : à faire"}</span>
                      </span>
                      {c.ok ? null : (
                        <Link href={c.action.href} className="underline underline-offset-2">
                          {c.action.label} →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
                <h3 id="billing-admin-docs" className="mt-4 mb-2 font-medium">
                  Documents administratifs
                </h3>
                <AdminDocsChecklist moduleId={id} adminDocs={ctx.module.admin_docs} />
              </section>

              <section aria-labelledby="missing">
                <h2 id="missing" className="mb-3 text-lg font-medium">
                  Mentions obligatoires
                </h2>
                {missing.length === 0 ? (
                  <p className="text-sm">Toutes les informations requises sont renseignées.</p>
                ) : (
                  <>
                    <ul className="text-warning list-inside list-disc text-sm">
                      {missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                    <p className="text-muted-foreground mt-2 text-sm">
                      À compléter dans{" "}
                      <Link href="/settings" className="underline underline-offset-2">
                        Réglages
                      </Link>{" "}
                      (profil, école) ou sur la{" "}
                      <Link href={`/modules/${id}/edit`} className="underline underline-offset-2">
                        fiche du module
                      </Link>
                      .
                    </p>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
