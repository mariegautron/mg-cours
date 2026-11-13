import { isSubjectToBuild } from "@/lib/prep-status";
import { schoolYearOf } from "@/lib/modules/list-state";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AgendaList, type AgendaItem } from "@/components/agenda/agenda-list";
import { kindOf } from "@/lib/assessments/individual";
import { PREP_STATUS_LABELS, PREP_STATUSES } from "@/lib/assessments/subject";
import { listAllAssessments } from "@/lib/assessments/queries";

export const metadata: Metadata = { title: "Agenda des évaluations" };

export default async function AssessmentsPage({ searchParams }: PageProps<"/assessments">) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const filtre = one("filtre");
  const moduleFilter = one("module");
  const typeFilter = one("type");
  const prepFilter = one("sujet");
  const fromDate = one("du");
  const toDate = one("au");
  const all = await listAllAssessments();
  const toGrade = filtre === "a-noter";
  // Chaque module une seule fois ; l'année scolaire entre parenthèses seulement quand deux
  // modules portent le même nom (lot 6, point 32).
  const uniqueModules = [
    ...new Map(
      all
        .filter((a) => a.module)
        .map((a) => [
          a.module!.id,
          { id: a.module!.id, name: a.module!.name, year: a.module!.year ?? null },
        ]),
    ).values(),
  ];
  // Année scolaire toujours affichée dans le filtre (demande du retest).
  const moduleOptions = uniqueModules
    .map((m) => [m.id, m.year ? `${m.name} (${schoolYearOf(m.year)})` : m.name] as const)
    .sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const items: AgendaItem[] = all.map((a) => ({
    id: a.id,
    moduleId: a.module_id,
    title: a.title,
    moduleLabel: a.module ? `${a.module.name} (${schoolYearOf(a.module.year)})` : "",
    date: a.date,
    groups: a.groups.map((g) => g.name).join(", "),
    kind: kindOf(a.type),
    prepStatus: a.prep_status,
    prepLabel: PREP_STATUS_LABELS[a.prep_status],
    toBuild: isSubjectToBuild(a),
    gradeCount: a.gradeCount,
    inProgressCount: a.inProgressCount,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Agenda des évaluations" meta="Toutes écoles et modules confondus." />
      {all.length === 0 ? (
        <EmptyState
          title="Aucune évaluation"
          description="Crée-en une depuis la page d’un module (onglet Évaluations)."
          actions={[{ label: "Voir les modules", href: "/modules" }]}
        />
      ) : (
        <AgendaList
          items={items}
          moduleOptions={moduleOptions}
          prepOptions={PREP_STATUSES.map((p) => [p, PREP_STATUS_LABELS[p]] as const)}
          initial={{
            module: moduleFilter,
            type: typeFilter,
            sujet: prepFilter,
            du: fromDate,
            au: toDate,
            toGrade,
          }}
        />
      )}
    </div>
  );
}
