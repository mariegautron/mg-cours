import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { listBillingOverview } from "@/lib/invoice/queries";
import { SIMPLE_STATUS_LABELS, simpleInvoiceStatus } from "@/lib/invoice/simple";
import { listModulesWithInvoiceFile } from "@/lib/invoice/tracking-queries";

export const metadata: Metadata = { title: "Facturation" };

export default async function BillingPage() {
  const [rows, withFile] = await Promise.all([listBillingOverview(), listModulesWithInvoiceFile()]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Facturation</h1>
        <p className="text-muted-foreground">
          Tu fais ta facture toi-même : dépose-la dans le module et coche « Envoyée » puis « Payée
          ».
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Rien à facturer"
          description="Un module apparaît ici dès qu’il existe. Crée-en un pour préparer sa facturation."
          actions={[{ label: "Créer un module", href: "/modules/new" }]}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.module.id}>
              <div className="rounded-lg border">
                <Link
                  href={`/modules/${r.module.id}/billing`}
                  className="hover:bg-accent focus-visible:ring-ring flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <div>
                    <p className="font-medium">{r.module.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {r.module.school?.name ?? "École non renseignée"} · {r.module.year}
                    </p>
                  </div>
                  {(() => {
                    const status = simpleInvoiceStatus({
                      hasFile: withFile.has(r.module.id),
                      state: r.module.iceberg_state,
                    });
                    return (
                      <Badge variant={status === "paid" ? "secondary" : "outline"}>
                        {SIMPLE_STATUS_LABELS[status]}
                      </Badge>
                    );
                  })()}
                </Link>
                <div className="space-y-1 px-3 pb-3 text-sm">
                  <p className="font-medium">{r.next.label}</p>
                  {r.kind === "blocked" ? (
                    <ul className="text-muted-foreground list-disc pl-5">
                      {r.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
