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
import { groupByAxis } from "@/lib/assessments/scoring";
import { criteriaTotal } from "@/lib/ynov/notation";

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
                    {criteriaTotal(g.criteria)} points
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
              <div className="text-muted-foreground mt-2 space-y-3 text-sm">
                {groupByAxis(g.criteria, g.axes).map((group) => (
                  <section key={group.axis?.id ?? "none"}>
                    {group.axis ? (
                      <h3 className="text-foreground font-medium">{group.axis.label}</h3>
                    ) : g.axes.length > 0 ? (
                      <h3 className="text-foreground font-medium">Autres critères</h3>
                    ) : null}
                    <ul className="space-y-2">
                      {group.criteria.map((c) => (
                        <li key={c.id}>
                          {c.label} ({c.weight}){c.is_bonus ? " · bonus hors barème" : ""}
                          {c.reference ? ` · ${c.reference}` : ""}
                          {c.levels.length ? (
                            <ul className="mt-1 ml-4 list-disc space-y-0.5">
                              {c.levels.map((l) => (
                                <li key={l.id}>
                                  <span className="text-foreground font-medium">{l.points} pt</span>
                                  {l.description ? ` — ${l.description}` : ""}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
