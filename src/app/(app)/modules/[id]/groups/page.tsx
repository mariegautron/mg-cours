import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { listModuleAssessments, moduleNoteProgress } from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Étudiant·es du module" };

export default async function ModuleGroupsPage({ params }: PageProps<"/modules/[id]/groups">) {
  const { id } = await params;
  const [mod, groups, assessments] = await Promise.all([
    getModule(id),
    listModuleGroups(id),
    listModuleAssessments(id),
  ]);
  if (!mod) notFound();
  const notes = await moduleNoteProgress(id, mod.total_hours, assessments);
  const gradedAssessments = assessments.filter((a) => !a.makeup_of_id && a.gradeCount > 0).length;

  return (
    <div className="max-w-4xl space-y-6">
      <section aria-labelledby="groups">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 id="groups" className="font-heading text-2xl font-bold">
            Groupes ({groups.length})
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/modules/${mod.id}/appreciations`}>Appréciations Hyperplanning</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/groups/wizard`}>Constituer les groupes</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/groups/new`}>
                <Plus aria-hidden />
                Ajouter un groupe
              </Link>
            </Button>
          </div>
        </div>
        {groups.length === 0 ? (
          <EmptyState
            compact
            title="Pas encore de groupes"
            description="Crée un groupe (TP, TD, projet) pour y rattacher les étudiant·es et saisir les notes."
            actions={[{ label: "Créer le premier groupe", href: `/modules/${mod.id}/groups/new` }]}
          />
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/modules/${mod.id}/groups/${g.id}`}
                  className="hover:bg-accent focus-visible:ring-ring block rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <p className="font-medium">{g.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {g.members.length} étudiant·e{g.members.length > 1 ? "s" : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="assessments" className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="assessments" className="text-lg font-medium">
              Évaluations
            </h2>
            <p className="text-muted-foreground text-sm">
              {assessments.length} évaluation{assessments.length > 1 ? "s" : ""}
              {assessments.length ? ` (${gradedAssessments} avec des notes saisies)` : ""} ·{" "}
              {notes.enteredTotal}/{notes.requirement.total} note
              {notes.requirement.total > 1 ? "s" : ""} requise
              {notes.requirement.total > 1 ? "s" : ""} obtenue
              {notes.enteredTotal > 1 ? "s" : ""}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/project`}>Projet fil rouge</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/assessments`}>Voir les évaluations</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
