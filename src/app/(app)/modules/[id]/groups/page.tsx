import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import {
  ClassOverview,
  type GroupOverviewRow,
  type OverviewRow,
} from "@/components/students/class-overview";
import { createClient } from "@/lib/supabase/server";
import { appreciationStatus, STATUS_LABELS } from "@/lib/appreciations/appreciation";
import { listAppreciations } from "@/lib/appreciations/queries";
import { listModuleObservations } from "@/lib/notebook/queries";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { EmptyState } from "@/components/empty-state";
import { StudentPhoto } from "@/components/students/student-photo";
import { OpenInWindowButton } from "@/components/present/open-in-window-button";
import { Button } from "@/components/ui/button";
import {
  listModuleAssessments,
  moduleNoteProgress,
  moduleStudentAverages,
} from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Étudiant·es du module" };

export default async function ModuleGroupsPage({ params }: PageProps<"/modules/[id]/groups">) {
  const { id } = await params;
  const [mod, groups, assessments, observations, appreciations, rules, averages] =
    await Promise.all([
      getModule(id),
      listModuleGroups(id),
      listModuleAssessments(id),
      listModuleObservations(id),
      listAppreciations(id),
      getSchoolRulesForModule(id),
      moduleStudentAverages(id),
    ]);
  if (!mod) notFound();
  const notes = await moduleNoteProgress(id, mod.total_hours, assessments);
  const people = [...new Map(groups.flatMap((g) => g.members).map((m) => [m.id, m])).values()];
  const averageOf = new Map(averages.map((a) => [a.student.id, a.average.average]));
  const overview: OverviewRow[] = people.map((m) => {
    const mine = observations.filter((o) => o.student_id === m.id);
    const count = (...tags: string[]) => mine.filter((o) => tags.includes(o.tag)).length;
    const status = appreciationStatus(
      appreciations.byStudent.get(m.id) ?? "",
      rules.appreciationMax,
    );
    return {
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      participation: count("participation"),
      question: count("relevant_question"),
      difficulty: count("difficulty"),
      other: count("other", "absent_late"),
      total: mine.length,
      average: averageOf.get(m.id) ?? null,
      appreciation: STATUS_LABELS[status],
      appreciationTone: status === "written" ? "ok" : status === "too_long" ? "lock" : "warn",
    };
  });
  // Une ligne par groupe : ses observations de groupe (même découpage par étiquette).
  const supabase = await createClient();
  const { data: groupObs } = groups.length
    ? await supabase
        .from("group_observation")
        .select("student_group_id, tag")
        .in(
          "student_group_id",
          groups.map((g) => g.id),
        )
    : { data: [] };
  const groupRows: GroupOverviewRow[] = groups.map((g) => {
    const mine = (groupObs ?? []).filter((o) => o.student_group_id === g.id);
    const count = (...tags: string[]) => mine.filter((o) => tags.includes(o.tag)).length;
    return {
      id: g.id,
      name: g.name,
      participation: count("participation"),
      question: count("relevant_question"),
      difficulty: count("difficulty"),
      other: count("other", "absent_late"),
      total: mine.length,
    };
  });
  const gradedAssessments = assessments.filter((a) => !a.makeup_of_id && a.gradeCount > 0).length;

  return (
    <div className="max-w-6xl space-y-6">
      <section aria-labelledby="groups">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 id="groups" className="font-heading text-2xl font-bold">
            Étudiant·es · {groups.length} groupe{groups.length > 1 ? "s" : ""}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/modules/${mod.id}/appreciations`}>Appréciations Hyperplanning</Link>
            </Button>
            {groups.length > 0 ? (
              <OpenInWindowButton
                href={`/present/modules/${mod.id}/groups`}
                size="sm"
                variant="outline"
              >
                Projeter la liste
              </OpenInWindowButton>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link href={`/modules/${mod.id}/groups/import`}>Ajouter les étudiant·es</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/students/photos">Trombinoscope</Link>
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
            description="Crée un groupe (TP, TD, projet) pour y rattacher les étudiant·es et saisir les notes. Il faut des étudiant·es dans le module pour former des groupes."
            actions={[
              { label: "Créer le premier groupe", href: `/modules/${mod.id}/groups/new` },
              { label: "Ajouter les étudiant·es", href: `/modules/${mod.id}/groups/import` },
            ]}
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
                  {g.members.length > 0 ? (
                    <span className="mt-2 flex flex-wrap gap-1" aria-hidden>
                      {g.members.slice(0, 8).map((m) => (
                        <StudentPhoto key={m.id} student={m} size="sm" />
                      ))}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {overview.length > 0 ? (
        <section aria-labelledby="overview" className="rounded-lg border p-4">
          <h2 id="overview" className="mb-2 text-lg font-medium">
            Vue de classe
          </h2>
          <p className="text-muted-foreground mb-2 text-sm">
            Tes observations privées, par personne. Clique un titre de colonne pour trier.
          </p>
          <ClassOverview moduleId={id} rows={overview} groups={groupRows} />
        </section>
      ) : null}

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
