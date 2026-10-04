import { schoolYearOf } from "@/lib/modules/list-state";
import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, MessageSquareText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAllAssessments } from "@/lib/assessments/queries";

export const metadata: Metadata = { title: "Évaluations" };

export default async function AssessmentsPage() {
  const assessments = await listAllAssessments();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Évaluations</h1>
          <p className="text-muted-foreground">Toutes écoles et modules confondus.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/assessments/grids">
              <ClipboardList aria-hidden />
              Grilles
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/assessments/comments">
              <MessageSquareText aria-hidden />
              Commentaires
            </Link>
          </Button>
        </div>
      </div>

      {assessments.length === 0 ? (
        <EmptyState
          title="Aucune évaluation"
          description="Crée-en une depuis la page d’un module (onglet Évaluations)."
          actions={[{ label: "Voir les modules", href: "/modules" }]}
        />
      ) : (
        <ul className="space-y-2">
          {assessments.map((a) => (
            <li key={a.id}>
              <Link
                href={`/modules/${a.module_id}/assessments/${a.id}`}
                className="hover:bg-accent focus-visible:ring-ring flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
              >
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {a.module?.name} ({a.module ? schoolYearOf(a.module.year) : ""}) ·{" "}
                    {a.groups.map((g) => g.name).join(", ") || "—"}
                  </p>
                </div>
                <Badge variant={a.gradeCount > 0 ? "secondary" : "outline"}>
                  {a.gradeCount > 0 ? "notée" : "à noter"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
