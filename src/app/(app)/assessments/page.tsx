import { isSubjectToBuild } from "@/lib/prep-status";
import { schoolYearOf } from "@/lib/modules/list-state";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { kindOf } from "@/lib/assessments/individual";
import { PREP_STATUS_LABELS, PREP_STATUSES } from "@/lib/assessments/subject";
import { listAllAssessments } from "@/lib/assessments/queries";

const SELECT = "border-input h-8 rounded-lg border bg-field px-2.5 text-sm";

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
  const assessments = all.filter(
    (a) =>
      (!toGrade || a.gradeCount === 0) &&
      (!moduleFilter || a.module_id === moduleFilter) &&
      (!typeFilter || kindOf(a.type) === typeFilter) &&
      (!prepFilter || a.prep_status === prepFilter) &&
      (!fromDate || (a.date ?? "") >= fromDate) &&
      (!toDate || (a.date !== null && a.date <= toDate)),
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = assessments
    .filter((a) => !a.date || a.date.slice(0, 10) >= todayIso)
    .sort((x, y) => (x.date ?? "9999").localeCompare(y.date ?? "9999"));
  const past = assessments
    .filter((a) => a.date && a.date.slice(0, 10) < todayIso)
    .sort((x, y) => (y.date ?? "").localeCompare(x.date ?? ""));

  return (
    <div className="space-y-6">
      <PageHeader title="Agenda des évaluations" meta="Toutes écoles et modules confondus." />

      <form
        role="search"
        aria-label="Filtrer les évaluations"
        className="flex flex-wrap items-end gap-3"
      >
        {toGrade ? <input type="hidden" name="filtre" value="a-noter" /> : null}
        <div className="space-y-1">
          <Label htmlFor="f-module">Module</Label>
          <select id="f-module" name="module" defaultValue={moduleFilter} className={SELECT}>
            <option value="">Tous</option>
            {moduleOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-type">Type</Label>
          <select id="f-type" name="type" defaultValue={typeFilter} className={SELECT}>
            <option value="">Tous</option>
            <option value="delivery">Rendu de fichiers ou de liens</option>
            <option value="open_questions">Questions ouvertes</option>
            <option value="quiz">QCM</option>
            <option value="oral">Oral</option>
            <option value="checkpoint">Point d’étape</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-sujet">État du sujet</Label>
          <select id="f-sujet" name="sujet" defaultValue={prepFilter} className={SELECT}>
            <option value="">Tous</option>
            {PREP_STATUSES.map((p) => (
              <option key={p} value={p}>
                {PREP_STATUS_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-du">Du</Label>
          <Input id="f-du" name="du" type="date" defaultValue={fromDate} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-au">Au</Label>
          <Input id="f-au" name="au" type="date" defaultValue={toDate} />
        </div>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
        <Button asChild variant="ghost">
          <Link href="/assessments">Effacer</Link>
        </Button>
      </form>

      {assessments.length === 0 ? (
        <EmptyState
          title="Aucune évaluation"
          description="Crée-en une depuis la page d’un module (onglet Évaluations)."
          actions={[{ label: "Voir les modules", href: "/modules" }]}
        />
      ) : (
        <>
          {/* De la plus proche à la plus lointaine ; sans date à la fin ; les passées repliées. */}
          {[
            { key: "upcoming", list: upcoming },
            { key: "past", list: past },
          ].map(({ key, list }) =>
            list.length === 0 ? null : key === "past" ? (
              <details key={key}>
                <summary className="text-muted-foreground min-h-11 cursor-pointer py-2 text-sm font-medium">
                  {list.length} évaluation{list.length > 1 ? "s" : ""} passée
                  {list.length > 1 ? "s" : ""}
                </summary>
                <ul className="space-y-2">
                  {list.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/modules/${a.module_id}/assessments/${a.id}`}
                        className="hover:bg-accent focus-visible:ring-ring flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-muted-foreground text-sm">
                            <strong className="text-foreground">{a.module?.name}</strong> (
                            {a.module ? schoolYearOf(a.module.year) : ""})
                            {a.date ? ` · ${new Date(a.date).toLocaleDateString("fr-FR")}` : ""} ·{" "}
                            {a.groups.map((g) => g.name).join(", ") || "—"}
                          </p>
                        </div>
                        <span className="flex flex-wrap gap-1.5">
                          <Badge variant={isSubjectToBuild(a) ? "outline" : "secondary"}>
                            Sujet : {PREP_STATUS_LABELS[a.prep_status]}
                          </Badge>
                          <Badge
                            variant={
                              a.gradeCount > 0 && a.inProgressCount === 0 ? "secondary" : "outline"
                            }
                          >
                            {a.inProgressCount > 0
                              ? "en cours"
                              : a.gradeCount > 0
                                ? "notée"
                                : "à noter"}
                          </Badge>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <ul key={key} className="space-y-2">
                {list.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/modules/${a.module_id}/assessments/${a.id}`}
                      className="hover:bg-accent focus-visible:ring-ring flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <div>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-muted-foreground text-sm">
                          <strong className="text-foreground">{a.module?.name}</strong> (
                          {a.module ? schoolYearOf(a.module.year) : ""})
                          {a.date ? ` · ${new Date(a.date).toLocaleDateString("fr-FR")}` : ""} ·{" "}
                          {a.groups.map((g) => g.name).join(", ") || "—"}
                        </p>
                      </div>
                      <span className="flex flex-wrap gap-1.5">
                        <Badge variant={isSubjectToBuild(a) ? "outline" : "secondary"}>
                          Sujet : {PREP_STATUS_LABELS[a.prep_status]}
                        </Badge>
                        <Badge
                          variant={
                            a.gradeCount > 0 && a.inProgressCount === 0 ? "secondary" : "outline"
                          }
                        >
                          {a.inProgressCount > 0
                            ? "en cours"
                            : a.gradeCount > 0
                              ? "notée"
                              : "à noter"}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ),
          )}
        </>
      )}
    </div>
  );
}
