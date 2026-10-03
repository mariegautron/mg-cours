import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { AppreciationList } from "@/components/appreciations/appreciation-list";
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Appréciations — {mod.name}</h1>
        <p className="text-muted-foreground">
          Une appréciation par étudiant·e, écrite par toi, à coller dans Hyperplanning. Longueur
          maximale de ton école : {rules.appreciationMax} caractères.{" "}
          <Link href="/settings#school-rules" className="underline underline-offset-2">
            Changer cette limite
          </Link>
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
        <AppreciationList
          moduleId={id}
          max={rules.appreciationMax}
          students={students.map((s) => ({
            id: s.id,
            firstName: s.first_name,
            lastName: s.last_name,
            text: appreciations.byStudent.get(s.id) ?? "",
            average: averageOf.get(s.id) ?? null,
          }))}
        />
      )}
    </div>
  );
}
