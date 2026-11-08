import { bonusLine } from "@/lib/assessments/score-scale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppreciationBasisPanel } from "@/components/appreciations/appreciation-basis";
import { sortRows } from "@/lib/appreciations/appreciation";
import { notebookStudents } from "@/lib/notebook/notebook";
import { listModuleGroups } from "@/lib/students/queries";
import { getAppreciationBasis } from "@/lib/appreciations/basis-queries";
import { AppreciationEditor } from "@/components/appreciations/appreciation-editor";
import { listAppreciations } from "@/lib/appreciations/queries";
import { moduleStudentAverages } from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { getStudent } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Appréciation" };

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/**
 * Appréciation d'une personne (maquette « AppFiche ») : à gauche ce qui sert de base (notes du
 * module, commentaires de correction, observations privées), à droite la saisie.
 */
export default async function AppreciationPage({
  params,
}: PageProps<"/modules/[id]/appreciations/[studentId]">) {
  const { id, studentId } = await params;
  const [mod, student, appreciations, averages, rules, basis] = await Promise.all([
    getModule(id),
    getStudent(studentId),
    listAppreciations(id),
    moduleStudentAverages(id),
    getSchoolRulesForModule(id),
    getAppreciationBasis(id, studentId),
  ]);
  if (!mod || !student) notFound();

  const found = averages.find((a) => a.student.id === studentId);
  const average = found?.average.average ?? null;
  const bonusText = bonusLine(found?.bonusEffect ?? null);
  const ordered = sortRows(
    notebookStudents(await listModuleGroups(id)).map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
    })),
  );
  const at = ordered.findIndex((s) => s.id === studentId);
  const neighbour = (d: number) => {
    const o = ordered[at + d];
    return at >= 0 && o
      ? { href: `/modules/${id}/appreciations/${o.id}`, name: `${o.firstName} ${o.lastName}` }
      : null;
  };
  const name = `${student.first_name} ${student.last_name}`;
  const initials = `${student.first_name.charAt(0)}${student.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <section
        aria-labelledby="ds"
        className="bg-card min-w-0 flex-[2_1_0] space-y-2 rounded-xl border p-5"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="bg-primary/20 text-primary flex size-12 items-center justify-center rounded-full text-lg font-bold"
          >
            {initials}
          </span>
          <div>
            <h2 id="ds" className="font-heading text-xl font-bold">
              {name}
            </h2>
            <p className="text-muted-foreground text-sm">
              {average !== null ? `Note du module ${fmt(average)} sur 20` : "Pas encore de note"}
              {bonusText && found?.bonusEffect && found.bonusEffect >= 0.005
                ? ` · ${bonusText}`
                : ""}
            </p>
          </div>
        </div>
        <h3 className="font-heading pt-2 font-bold">D’après</h3>
        <AppreciationBasisPanel
          lines={found?.lines ?? []}
          average={average}
          comments={basis.comments}
          observations={basis.observations}
          group={basis.group}
        />
        <p className="text-muted-foreground text-xs">
          Tes observations restent privées : à toi de décider ce que tu en fais.
        </p>
      </section>
      <div className="order-first min-w-0 flex-[3_1_0] lg:order-none">
        <AppreciationEditor
          moduleId={id}
          studentId={studentId}
          firstName={student.first_name}
          lastName={student.last_name}
          initial={appreciations.byStudent.get(studentId) ?? ""}
          max={rules.appreciationMax}
          backHref={`/modules/${id}/appreciations`}
          prev={neighbour(-1)}
          next={neighbour(1)}
        />
      </div>
    </div>
  );
}
