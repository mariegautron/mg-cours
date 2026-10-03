import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HyperplanningTable } from "@/components/assessments/hyperplanning-table";
import { PublishResults } from "@/components/assessments/publish-results";
import { ResultsActions } from "@/components/assessments/results-actions";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { hyperplanningRows } from "@/lib/assessments/hyperplanning";
import {
  getAssessment,
  getGradesByAssessment,
  listGroupGradeMembers,
} from "@/lib/assessments/queries";
import { loadResultSheets } from "@/lib/assessments/results-data";
import { resultsRecipients } from "@/lib/assessments/results";
import { gradingTargets } from "@/lib/assessments/targets";
import { formatNumber } from "@/lib/assessments/scoring";
import { listResultLinks } from "@/lib/result-links/queries";

export const metadata: Metadata = { title: "Envoyer les résultats" };

const card = "bg-card space-y-3 rounded-xl border p-5";

/**
 * Fin de correction (maquette « CorrFin ») : vérifier avant d'envoyer, puis publier par lien
 * personnel, exporter ou envoyer par e-mail. Rien ne part sans confirmation.
 */
export default async function ResultsPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/results">) {
  const { id, assessmentId } = await params;
  const [assessment, grades] = await Promise.all([
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
  ]);
  if (!assessment || assessment.module_id !== id) notFound();

  const back = `/modules/${id}/assessments/${assessmentId}`;
  const hasGrades = grades.some((g) => g.value !== null);
  const [overrides, loadedSheets, resultLinks] = await Promise.all([
    listGroupGradeMembers(grades.filter((g) => g.student_group_id).map((g) => g.id)),
    hasGrades || grades.some((g) => g.attendance === "absent_excused")
      ? loadResultSheets(id, assessmentId)
      : null,
    listResultLinks(assessmentId),
  ]);
  const sheets = loadedSheets ?? [];
  const recipients = hasGrades ? resultsRecipients(sheets) : { emails: 0, withoutEmail: [] };

  const noun = assessment.is_group_grade ? "groupe" : "étudiant·e";
  const targets = gradingTargets(assessment.is_group_grade, assessment.groups);
  const total = assessment.is_group_grade
    ? targets.length
    : targets.reduce((n, t) => n + t.students.length, 0);
  const values = grades.filter((g) => g.value !== null).map((g) => g.value as number);
  const done = values.length;
  const allDone = total > 0 && done >= total;
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  const absences = [...grades.map((g) => g.attendance), ...overrides.map((o) => o.attendance)];
  const unexcused = absences.filter((a) => a === "absent_unexcused").length;
  const excused = absences.filter((a) => a === "absent_excused").length;
  const words = overrides.filter((o) => o.justification?.trim()).length;
  const people = new Set(sheets.flatMap((s) => s.recipients.map((r) => r.name))).size;

  const checks: { label: string; ok: boolean; status: string }[] = [
    {
      label: `${done} ${noun === "groupe" ? (done > 1 ? "groupes" : "groupe") : done > 1 ? "étudiant·es" : "étudiant·e"} corrigé${done > 1 ? "s" : ""} sur ${total}`,
      ok: allDone,
      status: allDone ? "Prêt" : "À finir",
    },
    { label: `Mots personnels ajoutés (${words})`, ok: true, status: "Prêt" },
    {
      label: `Absent·e non prévenu·e : note 0 (${unexcused})`,
      ok: true,
      status: unexcused ? "Prêt" : "Rien à signaler",
    },
    {
      label: `Absent·e excusé·e (${excused})`,
      ok: true,
      status: excused ? "Prêt" : "Rien à signaler",
    },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Évaluations</p>
          <h1 className="text-3xl font-semibold">
            {allDone ? "Tout est corrigé : envoyer les résultats" : "Envoyer les résultats"}
          </h1>
          <p className="text-muted-foreground">
            {assessment.title}
            {people ? ` · ${people} personne${people > 1 ? "s" : ""}` : ""}. Vérifie, puis confirme
            : rien n’est parti avant ton clic.
          </p>
        </div>
        <Button asChild variant="ghost" size="touch">
          <Link href={back}>← Vue d’ensemble</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <section aria-labelledby="ver" className={`${card} min-w-0 flex-[1_1_0]`}>
          <h2 id="ver" className="text-lg font-semibold">
            Avant d’envoyer
          </h2>
          <ul className="divide-y text-sm">
            {checks.map((c) => (
              <li
                key={c.label}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <span>{c.label}</span>
                <Pill tone={c.ok ? "ok" : "warn"}>{c.status}</Pill>
              </li>
            ))}
            <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>Moyenne de la classe</span>
              <strong>
                {average !== null
                  ? `${formatNumber(average)} / ${formatNumber(assessment.maxScore)}`
                  : "—"}
              </strong>
            </li>
          </ul>
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-semibold">Ce que chaque étudiant·e recevra</p>
            <p className="text-muted-foreground mt-1">
              Sa note, le palier de chaque critère avec ton commentaire, les points forts et les
              progrès. Jamais ton carnet, ni les notes des autres.
            </p>
          </div>
        </section>

        <div className="min-w-0 flex-[1_1_0] space-y-4">
          <section
            aria-labelledby="pre"
            className="bg-primary/10 border-primary/50 space-y-3 rounded-xl border p-5"
          >
            <h2 id="pre" className="text-lg font-semibold">
              Comment envoyer ?
            </h2>
            {hasGrades ? (
              <PublishResults
                moduleId={id}
                assessmentId={assessmentId}
                available={resultLinks.available}
                students={Array.from(
                  new Map(
                    sheets
                      .flatMap((sheet) => sheet.recipients)
                      .filter((r) => r.id)
                      .map((r) => [r.id as string, r.name]),
                  ),
                ).map(([studentId, name]) => ({
                  id: studentId,
                  name,
                  link: resultLinks.byStudent.get(studentId) ?? null,
                  value:
                    sheets.find((sheet) => sheet.recipients.some((r) => r.id === studentId))
                      ?.value ?? null,
                }))}
              />
            ) : null}
            <ResultsActions
              moduleId={id}
              assessmentId={assessmentId}
              hasGrades={hasGrades}
              recipients={recipients}
              sentAt={assessment.results_sent_at}
            />
            <p className="text-muted-foreground text-xs">
              Une confirmation te demandera de valider avant la publication. Chaque étudiant·e voit
              seulement sa note.
            </p>
          </section>

          {sheets.length > 0 ? (
            <section aria-labelledby="sui" className={card}>
              <h2 id="sui" className="font-semibold">
                Ensuite
              </h2>
              <p className="text-muted-foreground text-sm">
                Reporter les notes dans Hyperplanning, puis donner le lien personnel aux
                étudiant·es.
              </p>
              <HyperplanningTable
                moduleId={id}
                assessmentId={assessmentId}
                rows={hyperplanningRows(sheets)}
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
