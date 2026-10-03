import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { AppreciationExport } from "@/components/appreciations/appreciation-export";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { appreciationStatus, countText, STATUS_LABELS } from "@/lib/appreciations/appreciation";
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
    firstName: s.first_name,
    lastName: s.last_name,
    text: appreciations.byStudent.get(s.id) ?? "",
  }));
  const tooLong = rows.filter(
    (r) => appreciationStatus(r.text, rules.appreciationMax) === "too_long",
  ).length;
  const written = rows.filter((r) => r.text.trim() !== "").length;

  return (
    <div className="max-w-6xl space-y-5">
      <div className="space-y-1">
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Évaluations</p>
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
            <ul className="divide-y">
              {students.map((s) => {
                const text = appreciations.byStudent.get(s.id) ?? "";
                const status = appreciationStatus(text, rules.appreciationMax);
                const average = averageOf.get(s.id) ?? null;
                const name = `${s.first_name} ${s.last_name}`;
                return (
                  <li key={s.id} className="space-y-1 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        aria-hidden
                        className="bg-primary/20 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      >
                        {s.first_name.charAt(0)}
                        {s.last_name.charAt(0)}
                      </span>
                      <strong className="min-w-0 flex-1">{name}</strong>
                      <span className="text-muted-foreground text-sm">
                        Note{" "}
                        {average !== null
                          ? average.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
                          : "—"}
                      </span>
                      <Pill
                        tone={status === "written" ? "ok" : status === "too_long" ? "lock" : "warn"}
                      >
                        {STATUS_LABELS[status]}
                      </Pill>
                      <span className="text-muted-foreground text-sm">
                        {text.trim() ? countText(text).chars : 0} caractères
                      </span>
                      <Button asChild variant="ghost" size="touch">
                        <Link href={`/modules/${id}/appreciations/${s.id}`}>
                          {text.trim() ? "Relire" : "Écrire"}
                          <span className="sr-only"> l’appréciation de {name}</span>
                        </Link>
                      </Button>
                    </div>
                    {text.trim() ? (
                      <p className="text-muted-foreground pl-12 text-sm">{text}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="min-w-0 flex-[2_1_0] space-y-4">
            <section aria-labelledby="rg" className="bg-card space-y-2 rounded-xl border p-5">
              <h2 id="rg" className="text-lg font-semibold">
                Comment les rédiger
              </h2>
              <p className="text-muted-foreground text-sm">
                Longueur maximale de ton école (celle du champ d’Hyperplanning) :{" "}
                <strong className="text-foreground">{rules.appreciationMax} caractères</strong>.{" "}
                <Link href="/settings#school-rules" className="underline underline-offset-2">
                  Changer cette limite
                </Link>
              </p>
              <p className="text-muted-foreground text-sm">
                Ce qui sert de base, à toi de choisir :
              </p>
              <ul className="text-muted-foreground list-disc pl-5 text-sm">
                <li>les notes du module, individuelles et de groupe ;</li>
                <li>tes commentaires de correction (points forts, progrès) ;</li>
                <li>tes observations de séance (privées).</li>
              </ul>
            </section>
            <section aria-labelledby="ex" className="bg-primary/10 space-y-2 rounded-xl border p-5">
              <h2 id="ex" className="text-lg font-semibold">
                Reporter dans Hyperplanning
              </h2>
              <AppreciationExport rows={rows} tooLong={tooLong} />
            </section>
            <Button asChild variant="ghost" size="touch">
              <Link href={`/modules/${id}/assessments`}>← Les évaluations</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
