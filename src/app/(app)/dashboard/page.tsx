import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listBillingOverview } from "@/lib/invoice/queries";
import { listModules } from "@/lib/modules/queries";
import { trameStatus } from "@/lib/ynov/trame";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const [modules, billing] = await Promise.all([listModules(), listBillingOverview()]);
  const toInvoice = billing.filter((b) => b.kind === "ready");
  const toSend = billing.filter((b) => b.kind === "invoiced" && b.invoice.status === "ready");
  const toCollect = billing.filter((b) => b.kind === "invoiced" && b.invoice.status === "sent");
  const trames = modules
    .map((m) => ({ module: m, status: trameStatus(m.first_session_date, m.iceberg_state) }))
    .filter((t) => t.status.level === "urgent" || t.status.level === "overdue")
    .sort((a, b) => (a.status.daysUntilDue ?? 0) - (b.status.daysUntilDue ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Trames à envoyer, notes à saisir, factures à générer.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modules actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{modules.length}</p>
            <Link href="/modules" className="text-sm underline underline-offset-2">
              Voir les modules
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trames urgentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trames.length === 0 ? (
              <p className="text-muted-foreground text-sm">Rien d’urgent pour l’instant.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {trames.map((t) => (
                  <li key={t.module.id}>
                    <Link href={`/modules/${t.module.id}`} className="underline underline-offset-2">
                      {t.module.name}
                    </Link>{" "}
                    <Badge variant="destructive">
                      {t.status.level === "overdue"
                        ? `en retard de ${Math.abs(t.status.daysUntilDue ?? 0)} j`
                        : `J-${t.status.daysUntilDue}`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facturation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{toInvoice.length} module(s) prêt(s) à facturer</p>
            <p>{toSend.length} facture(s) à envoyer</p>
            <p>{toCollect.length} paiement(s) attendu(s)</p>
            <Link href="/billing" className="underline underline-offset-2">
              Voir la facturation
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
