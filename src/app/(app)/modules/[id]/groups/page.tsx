import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { StudentPhoto } from "@/components/students/student-photo";
import { OpenInWindowButton } from "@/components/present/open-in-window-button";
import { Button } from "@/components/ui/button";
import { getModule } from "@/lib/modules/queries";
import { listModuleGroups } from "@/lib/students/queries";
import { listEnrollments } from "@/lib/students/enrollment";
import { ModuleRoster, type RosterRow } from "@/components/students/module-roster";

export const metadata: Metadata = { title: "Étudiant·es du module" };

export default async function ModuleGroupsPage({ params }: PageProps<"/modules/[id]/groups">) {
  const { id } = await params;
  const [mod, groups, enrolled] = await Promise.all([
    getModule(id),
    listModuleGroups(id),
    listEnrollments(id),
  ]);
  if (!mod) notFound();
  const leftIds = new Set(enrolled.rows.filter((e) => e.leftAt).map((e) => e.studentId));
  // Inscrit·es (avec ou sans groupe) : noms des fiches qui ne sont dans aucun groupe.
  const memberById = new Map(groups.flatMap((g) => g.members).map((m) => [m.id, m]));
  const outside = enrolled.rows.map((e) => e.studentId).filter((sid) => !memberById.has(sid));
  const { data: outsideRows } = outside.length
    ? await (
        await createClient()
      )
        .from("student")
        .select("id, first_name, last_name")
        .in("id", outside)
    : { data: [] };
  const nameOf = new Map([
    ...[...memberById.values()].map((m) => [m.id, `${m.first_name} ${m.last_name}`] as const),
    ...(outsideRows ?? []).map((m) => [m.id, `${m.first_name} ${m.last_name}`] as const),
  ]);
  const roster: RosterRow[] = enrolled.rows
    .map((e) => ({
      id: e.studentId,
      name: nameOf.get(e.studentId) ?? "Fiche supprimée",
      groups: groups.filter((g) => g.members.some((m) => m.id === e.studentId)).map((g) => g.name),
      leftAt: e.leftAt,
    }))
    .sort((a, b) => Number(!!a.leftAt) - Number(!!b.leftAt) || a.name.localeCompare(b.name, "fr"));
  return (
    <div className="max-w-6xl space-y-6">
      <section aria-labelledby="groups">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 id="groups">
            Étudiant·es · {groups.length} groupe{groups.length > 1 ? "s" : ""}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/modules/${mod.id}/appreciations`}>Appréciations</Link>
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
              <Link href="/students/photos">Photos</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/groups/wizard`}>Faire les groupes</Link>
            </Button>
          </div>
        </div>
        {groups.length === 0 ? (
          <EmptyState
            compact
            title="Pas encore de groupes"
            description="Crée un groupe (TP, TD, projet) pour y rattacher les étudiant·es et saisir les notes. Il faut des étudiant·es dans le module pour former des groupes."
            actions={[
              { label: "Faire les groupes", href: `/modules/${mod.id}/groups/wizard` },
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
                  {(() => {
                    // Les personnes parties ne comptent plus ; elles restent visibles, grisées.
                    const active = g.members.filter((m) => !leftIds.has(m.id)).length;
                    const gone = g.members.length - active;
                    return (
                      <p className="text-muted-foreground text-sm">
                        {active} étudiant·e{active > 1 ? "s" : ""}
                        {gone ? ` · ${gone} parti·e${gone > 1 ? "s" : ""}` : ""}
                      </p>
                    );
                  })()}
                  {g.members.length > 0 ? (
                    <span className="mt-2 flex flex-wrap gap-1" aria-hidden>
                      {g.members.slice(0, 8).map((m) => (
                        <span
                          key={m.id}
                          className={leftIds.has(m.id) ? "opacity-40 grayscale" : ""}
                        >
                          <StudentPhoto student={m} size="sm" />
                        </span>
                      ))}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ModuleRoster moduleId={id} rows={roster} />
    </div>
  );
}
