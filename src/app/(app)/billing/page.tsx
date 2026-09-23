import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { listBillingOverview } from "@/lib/invoice/queries";

export const metadata: Metadata = { title: "Facturation" };

const STATUS_LABEL = {
  draft: "Brouillon",
  ready: "À envoyer",
  sent: "Envoyée",
  paid: "Payée",
} as const;

export default async function BillingPage() {
  const rows = await listBillingOverview();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Facturation</h1>
        <p className="text-muted-foreground">
          Facture électronique Factur-X (EN 16931), conforme aux exigences YNOV.
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun module</EmptyTitle>
            <EmptyDescription>Créez un module pour préparer sa facturation.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/modules/new">Nouveau module</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.module.id}>
              <Link
                href={`/modules/${r.module.id}/billing`}
                className="hover:bg-accent focus-visible:ring-ring flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
              >
                <div>
                  <p className="font-medium">{r.module.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {r.module.school?.name ?? "École non renseignée"} · {r.module.year}
                  </p>
                </div>
                {r.kind === "invoiced" ? (
                  <Badge variant={r.invoice.status === "paid" ? "secondary" : "outline"}>
                    {r.invoice.number} · {STATUS_LABEL[r.invoice.status]}
                  </Badge>
                ) : r.kind === "ready" ? (
                  <Badge>Prêt à facturer</Badge>
                ) : (
                  <Badge variant="outline">
                    Bloqué — {r.reasons} point{r.reasons > 1 ? "s" : ""} à traiter
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
