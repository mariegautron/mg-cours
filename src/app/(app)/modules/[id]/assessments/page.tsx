import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  listModuleAssessments,
  moduleNoteProgress,
  moduleStudentAverages,
} from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";

export async function generateMetadata({
  params,
}: PageProps<"/modules/[id]/assessments">): Promise<Metadata> {
  const { id } = await params;
  const mod = await getModule(id);
  return { title: mod ? `Évaluations — ${mod.name}` : "Évaluations" };
}

export default async function ModuleAssessmentsPage({
  params,
}: PageProps<"/modules/[id]/assessments">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();

  const [assessments, progress, averages] = await Promise.all([
    listModuleAssessments(id),
    moduleNoteProgress(id, mod.total_hours),
    moduleStudentAverages(id),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Évaluations — {mod.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={progress.satisfied ? "secondary" : "outline"}>
              {progress.enteredTotal}/{progress.requirement.total} note
              {progress.requirement.total > 1 ? "s" : ""} requise
              {progress.requirement.total > 1 ? "s" : ""}
            </Badge>
            {!progress.satisfied ? (
              <span className="text-muted-foreground text-sm">
                manque {progress.missingGroup} groupe{progress.missingGroup > 1 ? "s" : ""} +{" "}
                {progress.missingIndividual} individuelle{progress.missingIndividual > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </div>
        <Button asChild size="sm">
          <Link href={`/modules/${id}/assessments/new`}>
            <Plus aria-hidden />
            Nouvelle évaluation
          </Link>
        </Button>
      </div>

      <section aria-labelledby="assessments-list">
        <h2 id="assessments-list" className="mb-3 text-lg font-medium">
          Évaluations ({assessments.length})
        </h2>
        {assessments.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Aucune évaluation</EmptyTitle>
              <EmptyDescription>Créez la première pour ce module.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href={`/modules/${id}/assessments/new`}>Nouvelle évaluation</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {assessments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/modules/${id}/assessments/${a.id}`}
                  className="hover:bg-accent focus-visible:ring-ring flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {a.student_group?.name ?? "—"} ·{" "}
                      {a.is_group_grade ? "note de groupe" : "note individuelle"}
                      {a.date ? ` · ${new Date(a.date).toLocaleDateString("fr-FR")}` : ""}
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
      </section>

      {averages.length > 0 ? (
        <section aria-labelledby="averages">
          <h2 id="averages" className="mb-3 text-lg font-medium">
            Moyennes pondérées
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="p-2 text-left">
                    Étudiant·e
                  </th>
                  <th scope="col" className="p-2 text-left">
                    Moyenne
                  </th>
                </tr>
              </thead>
              <tbody>
                {averages.map(({ student, average }) => (
                  <tr key={student.id} className="border-t">
                    <td className="p-2">
                      <Link
                        href={`/students/${student.id}`}
                        className="underline underline-offset-2"
                      >
                        {student.first_name} {student.last_name}
                      </Link>
                    </td>
                    <td className="p-2">
                      {average.average !== null ? average.average.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Pondération YNOV : note de groupe ×1, note individuelle ×3.
          </p>
        </section>
      ) : null}
    </div>
  );
}
