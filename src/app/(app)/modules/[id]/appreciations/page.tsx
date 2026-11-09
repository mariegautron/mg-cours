import type { Metadata } from "next";
import { BackLink } from "@/components/ui/back-link";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { AppreciationList } from "@/components/appreciations/appreciation-list";
import { AppreciationExport } from "@/components/appreciations/appreciation-export";
import { appreciationStatus, hasHole, sortRows } from "@/lib/appreciations/appreciation";
import { moduleStudentAverages } from "@/lib/assessments/queries";
import { listAppreciations } from "@/lib/appreciations/queries";
import { getModule } from "@/lib/modules/queries";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { notebookStudents } from "@/lib/notebook/notebook";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Appréciations" };

/** Appréciations à saisir dans Hyperplanning, écrites à la main (US-149a). */
export default async function AppreciationsPage({
  params,
}: PageProps<"/modules/[id]/appreciations">) {
  const { id } = await params;
  const [mod, groups, appreciations, averages, rules] = await Promise.all([
    getModule(id),
    listModuleGroups(id),
    listAppreciations(id),
    moduleStudentAverages(id),
    getSchoolRulesForModule(id),
  ]);
  if (!mod) notFound();

  const students = notebookStudents(groups);
  const averageOf = new Map(averages.map((a) => [a.student.id, a.average.average]));

  const rows = students.map((s) => ({
    studentId: s.id,
    firstName: s.first_name,
    lastName: s.last_name,
    // Un gabarit avec un trou à compléter n'est jamais exporté.
    text: hasHole(appreciations.byStudent.get(s.id) ?? "")
      ? ""
      : (appreciations.byStudent.get(s.id) ?? ""),
  }));
  const tooLong = rows.filter(
    (r) => appreciationStatus(r.text, rules.appreciationMax) === "too_long",
  ).length;
  const written = rows.filter((r) => r.text.trim() !== "").length;

  return (
    <div className="max-w-6xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">Appréciations — {mod.name}</h1>
        <p className="text-muted-foreground">
          Une appréciation par étudiant·e, écrite par toi, à coller dans Hyperplanning. {written}{" "}
          écrite{written > 1 ? "s" : ""} sur {students.length}.
        </p>
      </div>

      {!appreciations.available ? (
        <p role="status" className="bg-muted rounded-lg border border-dashed p-4 text-sm">
          Les appréciations seront disponibles après la mise à jour de la base de données. Rien
          n’est perdu : reviens ici ensuite.
        </p>
      ) : students.length === 0 ? (
        <EmptyState
          title="Personne dans ce module"
          description="Ajoute des étudiant·es aux groupes du module pour écrire leurs appréciations."
          actions={[{ label: "Voir les groupes", href: `/modules/${id}/groups` }]}
        />
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <section
            aria-labelledby="ap"
            className="bg-card min-w-0 flex-[3_1_0] space-y-1 rounded-xl border p-5"
          >
            <h2 id="ap" className="sr-only">
              Appréciations par personne
            </h2>
            <AppreciationList
              moduleId={id}
              max={rules.appreciationMax}
              rows={sortRows(
                students.map((s) => ({
                  studentId: s.id,
                  firstName: s.first_name,
                  lastName: s.last_name,
                  text: appreciations.byStudent.get(s.id) ?? "",
                  reportedText: appreciations.reported.get(s.id) ?? null,
                  average: averageOf.get(s.id) ?? null,
                })),
              )}
            />
          </section>

          <div className="min-w-0 flex-[2_1_0] space-y-4">
            <section aria-labelledby="rg" className="bg-card space-y-2 rounded-xl border p-5">
              <h2 id="rg" className="text-lg font-semibold">
                Comment les rédiger
              </h2>
              <p className="text-muted-foreground text-sm">
                {mod.school ? (
                  <>Longueur maximale pour {mod.school.name} (celle du champ d’Hyperplanning) : </>
                ) : (
                  <>Limite par défaut : </>
                )}
                <strong className="text-foreground">{rules.appreciationMax} caractères</strong>.{" "}
                {mod.school ? (
                  <Link
                    href={`/settings?retour=${encodeURIComponent(`/modules/${id}/appreciations`)}#rules-${mod.school.id}`}
                    className="underline underline-offset-2"
                  >
                    Changer cette limite pour {mod.school.name}
                  </Link>
                ) : (
                  <Link href={`/modules/${id}/edit`} className="underline underline-offset-2">
                    Choisir l’école du module
                  </Link>
                )}
              </p>
              <p className="text-muted-foreground text-sm">
                Un point fort, un axe de progrès, un encouragement. Au « tu ».
              </p>
            </section>
            <section aria-labelledby="ex" className="bg-primary/10 space-y-2 rounded-xl border p-5">
              <h2 id="ex" className="text-lg font-semibold">
                Reporter dans Hyperplanning
              </h2>
              <AppreciationExport moduleId={id} rows={rows} tooLong={tooLong} />
            </section>
            <BackLink href={`/modules/${id}/assessments`}>← Retour</BackLink>
          </div>
        </div>
      )}
    </div>
  );
}
