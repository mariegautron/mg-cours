import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
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
          <CardContent className="text-muted-foreground text-sm">
            Bientôt disponible (E3).
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trames en attente</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Bientôt disponible (E6).
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facturation</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Bientôt disponible (E7).
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
