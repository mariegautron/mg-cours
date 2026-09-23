import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { DeleteGridButton } from "@/components/assessments/delete-buttons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { listGrids } from "@/lib/assessments/queries";

export const metadata: Metadata = { title: "Grilles de correction" };

export default async function GridsPage() {
  const grids = await listGrids();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Grilles de correction</h1>
          <p className="text-muted-foreground">Réutilisables dans plusieurs évaluations.</p>
        </div>
        <Button asChild>
          <Link href="/assessments/grids/new">
            <Plus aria-hidden />
            Nouvelle grille
          </Link>
        </Button>
      </div>

      {grids.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucune grille</EmptyTitle>
            <EmptyDescription>
              Créez une grille pour l’appliquer à vos évaluations.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/assessments/grids/new">Nouvelle grille</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {grids.map((g) => (
            <li key={g.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium">{g.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {g.criteria.length} critère{g.criteria.length > 1 ? "s" : ""} ·{" "}
                    {g.criteria.reduce((s, c) => s + c.weight, 0)} points
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/assessments/grids/${g.id}/edit`}>
                      <Pencil aria-hidden />
                      Modifier
                    </Link>
                  </Button>
                  <DeleteGridButton id={g.id} />
                </div>
              </div>
              <ul className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {g.criteria.map((c) => (
                  <li key={c.id}>
                    {c.label} ({c.weight})
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
