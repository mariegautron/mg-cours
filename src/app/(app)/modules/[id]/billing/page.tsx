import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";

import { GenerateInvoiceButton, InvoiceActions } from "@/components/billing/invoice-actions";
import { Badge } from "@/components/ui/badge";
import { getInvoiceByModule, loadInvoiceContext } from "@/lib/invoice/queries";
import { ExternalInvoicePaid } from "@/components/billing/external-invoice-paid";
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
  const [mod, ctx, invoice, documents] = await Promise.all([
    getModule(id),
    loadInvoiceContext(id),
    getInvoiceByModule(id),
    getModuleDocuments(id),
  ]);
  if (!mod || !ctx) notFound();

  const blockers = invoiceBlockers(ctx);
  const missing = missingInvoiceData(ctx);
  const canGenerate = blockers.length === 0 && missing.length === 0;

  const conditions = [
    {
      ok: !blockers.includes(OUTLINE_NOT_SENT),
      label: "Progression pédagogique envoyée",
    },
    {
      ok: ctx.notes.satisfied,
      label: `Notes saisies (${ctx.notes.enteredTotal}/${ctx.notes.requiredTotal} requises)`,
    },
  ];

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
                    <CircleCheck
                      aria-hidden
                      className="size-4 text-emerald-600 dark:text-emerald-400"
                    />
                  ) : (
                    <CircleAlert aria-hidden className="text-destructive size-4" />
                  )}
                  <span>
                    {c.label}
                    <span className="sr-only">{c.ok ? " : fait" : " : à faire"}</span>
                  </span>
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
                <ul className="text-destructive list-inside list-disc text-sm">
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

          <GenerateInvoiceButton moduleId={id} disabled={!canGenerate} />
        </>
      )}

      <section aria-labelledby="external" className="space-y-3 rounded-lg border p-4">
        <div>
          <h2 id="external" className="text-lg font-medium">
            Facture émise hors application
          </h2>
          <p className="text-muted-foreground text-sm">
            Facture faite avec un autre outil : déposez le PDF pour le conserver ici, puis marquez
            le module comme payé une fois réglé.
          </p>
        </div>
        <DocumentSlot
          moduleId={id}
          kind="external_invoice"
          title="Facture (PDF)"
          hint="Le fichier reste attaché au module."
          documents={documents.filter((d) => d.kind === "external_invoice")}
        />
        <ExternalInvoicePaid moduleId={id} paid={mod.iceberg_state === "paid"} />
      </section>
    </div>
  );
}
