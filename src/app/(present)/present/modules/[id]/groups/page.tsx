import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PresentShell } from "@/components/present/present-shell";
import { getModule } from "@/lib/modules/queries";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Les groupes — présentation" };

/** La liste des groupes projetée en classe : noms seulement, jamais de photo ni de note. */
export default async function PresentGroupsPage({
  params,
}: PageProps<"/present/modules/[id]/groups">) {
  const { id } = await params;
  const [mod, groups] = await Promise.all([getModule(id), listModuleGroups(id)]);
  if (!mod) notFound();

  return (
    <PresentShell
      title={`${mod.name} — les groupes`}
      backHref={`/modules/${id}/groups`}
      backLabel="les groupes du module"
      sections={["Groupes"]}
      slides={[
        {
          section: 0,
          label: "Les groupes",
          node: (
            <div className="space-y-8">
              <h2 className="font-heading text-5xl font-semibold">Les groupes</h2>
              {groups.length === 0 ? (
                <p className="text-muted-foreground text-3xl">Aucun groupe pour l’instant.</p>
              ) : (
                <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {groups.map((g) => (
                    <li key={g.id} className="bg-card rounded-3xl border-2 p-6">
                      <h3 className="font-heading text-4xl font-bold">{g.name}</h3>
                      <ul className="mt-3 space-y-1 text-3xl">
                        {g.members.map((m) => (
                          <li key={m.id}>
                            {m.first_name} {m.last_name.charAt(0)}.
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
