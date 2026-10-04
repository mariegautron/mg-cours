import { bonusLine } from "@/lib/assessments/score-scale";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppreciationEditor } from "@/components/appreciations/appreciation-editor";
import { listAppreciations } from "@/lib/appreciations/queries";
import { moduleStudentAverages } from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";
import { listModuleObservations } from "@/lib/notebook/queries";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { getStudent } from "@/lib/students/queries";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const [mod, student, appreciations, averages, rules, observations, { data: grades }] =
    await Promise.all([
      getModule(id),
      getStudent(studentId),
      listAppreciations(id),
      moduleStudentAverages(id),
      getSchoolRulesForModule(id),
      listModuleObservations(id),
      supabase
        .from("grade")
        .select("value, strengths, progress, assessment:assessment_id(title, module_id)")
        .eq("student_id", studentId),
    ]);
  if (!mod || !student) notFound();

  const found = averages.find((a) => a.student.id === studentId);
  const average = found?.average.average ?? null;
  const bonusText = bonusLine(found?.bonusEffect ?? null);
  const own = (
    (grades ?? []) as unknown as {
      value: number | null;
      strengths: string | null;
      progress: string | null;
      assessment: { title: string; module_id: string } | null;
    }[]
  ).filter((g) => g.assessment?.module_id === id);
  const notes = own.filter((g) => g.value !== null);
  const strengths = own.map((g) => g.strengths?.trim()).filter(Boolean);
  const progress = own.map((g) => g.progress?.trim()).filter(Boolean);
  const privateNotes = observations.filter((o) => o.student_id === studentId).length;
  const name = `${student.first_name} ${student.last_name}`;
  const initials = `${student.first_name.charAt(0)}${student.last_name.charAt(0)}`.toUpperCase();

  const source = (label: string, detail: string, used: boolean) => (
    <li className="flex items-start gap-3 border-t py-3 first:border-t-0">
      <span
        aria-hidden
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-extrabold ${used ? "bg-primary text-primary-foreground border-transparent" : ""}`}
      >
        {used ? "✓" : ""}
      </span>
      <span>
        <strong className="text-sm">{label}</strong>
        <span className="text-muted-foreground block text-sm">{detail}</span>
      </span>
    </li>
  );

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
        <ul>
          {source(
            "Notes",
            notes.length
              ? notes.map((g) => `${g.assessment?.title} : ${fmt(g.value as number)}`).join(" · ")
              : "Aucune note saisie",
            notes.length > 0,
          )}
          {source(
            "Tes commentaires de correction",
            [
              strengths.length ? `Points forts : ${strengths.join(" ; ")}` : null,
              progress.length ? `Progrès : ${progress.join(" ; ")}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Aucun commentaire de correction",
            strengths.length + progress.length > 0,
          )}
          {source(
            "Mes observations de séance",
            privateNotes
              ? `${privateNotes} note${privateNotes > 1 ? "s" : ""} privée${privateNotes > 1 ? "s" : ""}, à relire dans le carnet`
              : "Aucune note privée",
            false,
          )}
        </ul>
        <p className="text-muted-foreground text-xs">
          Tes observations restent privées : à toi de décider ce que tu en fais.
        </p>
      </section>
      <div className="min-w-0 flex-[3_1_0]">
        <AppreciationEditor
          moduleId={id}
          studentId={studentId}
          firstName={student.first_name}
          lastName={student.last_name}
          initial={appreciations.byStudent.get(studentId) ?? ""}
          max={rules.appreciationMax}
          backHref={`/modules/${id}/appreciations`}
        />
      </div>
    </div>
  );
}
