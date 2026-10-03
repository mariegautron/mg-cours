import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  jalonsCount,
  notesMessage,
  requirementLabel,
  totalCoefficient,
} from "@/lib/assessments/module-notes";
import {
  buildTimeline,
  courseCellLabel,
  courseHeader,
  frameStatus,
  gridStatus,
  type CellKind,
  type Status,
  type TimelineCell,
} from "@/lib/assessments/module-overview";
import {
  listModuleAssessments,
  moduleNoteProgress,
  moduleStudentAverages,
} from "@/lib/assessments/queries";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { getModuleProject } from "@/lib/projects/queries";
import { PROJECT_ROLE_LABELS } from "@/lib/ynov/project-skeleton";

export async function generateMetadata({
  params,
}: PageProps<"/modules/[id]/assessments">): Promise<Metadata> {
  const { id } = await params;
  const mod = await getModule(id);
  return { title: mod ? `Évaluations — ${mod.name}` : "Évaluations" };
}

const CELL_STYLE: Record<CellKind, string> = {
  launch: "bg-primary text-primary-foreground font-bold",
  work: "bg-primary/15 border border-primary/40",
  due: "bg-primary text-primary-foreground font-bold",
  oral: "bg-primary text-primary-foreground font-bold",
  solo: "bg-sky/20 border border-sky/50",
};

const STATUS_TONE = { ok: "ok", warn: "warn", build: "warn" } as const;

function StatusRow({ label, status }: { label: string; status: Status }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t py-2 text-sm">
      <span>{label}</span>
      <Pill tone={STATUS_TONE[status.tone]} className="whitespace-normal">
        {status.label}
      </Pill>
    </div>
  );
}

export default async function ModuleAssessmentsPage({
  params,
}: PageProps<"/modules/[id]/assessments">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();

  const [assessments, progress, averages, courses, project] = await Promise.all([
    listModuleAssessments(id),
    moduleNoteProgress(id, mod.total_hours),
    moduleStudentAverages(id),
    getModuleCourses(id),
    getModuleProject(id),
  ]);

  const regular = assessments.filter((a) => !a.makeup_of_id);
  const makeups = assessments.filter((a) => a.makeup_of_id);
  const timeline = buildTimeline(
    courses.map((c) => ({
      id: c.id,
      title: c.title,
      date: c.session_date,
      toBuild: c.prep_status !== "ready",
    })),
    regular.map((a) => ({
      id: a.id,
      title: a.title,
      courseId: a.course_id,
      role: a.project_role,
      isGroupGrade: a.is_group_grade,
      makeup: false,
    })),
  );
  const byId = new Map(assessments.map((a) => [a.id, a]));
  const ordered = timeline.map((row) => byId.get(row.assessmentId)!).filter(Boolean);
  const dueSessions = new Set(timeline.filter((r) => r.dueSession).map((r) => r.assessmentId));
  const unplaced = regular.filter((a) => !timeline.some((r) => r.assessmentId === a.id));
  const cards = [...ordered, ...unplaced];
  const card = "bg-card rounded-3xl border p-5 shadow-sm";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Évaluations
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Évaluations — {mod.name}
          </h1>
          <p role="status" className="text-muted-foreground mt-1">
            {requirementLabel(mod.total_hours, progress)}. {notesMessage(progress)} Jalons du projet
            : {jalonsCount(assessments)} · coefficients cumulés : {totalCoefficient(assessments)}.
            Le projet fil rouge porte le brief et le contexte ; chaque jalon porte ses attendus et
            sa grille. Clique une évaluation pour la préparer.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/modules/${id}`}>← Retour au module</Link>
        </Button>
      </div>

      <section aria-labelledby="proj" className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-[min(18rem,100%)] flex-1">
            <h2 id="proj" className="font-heading text-xl font-bold">
              {project ? `Projet : ${project.title}` : "Pas encore de projet fil rouge"}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {project
                ? `${project.brief_md.trim() ? "Brief rédigé" : "Brief à rédiger"}${
                    project.themes.length ? ` · ${project.themes.length} thèmes au choix` : ""
                  }`
                : "Commence par le projet : il organise les jalons. Tu peux aussi créer directement une évaluation."}
            </p>
          </div>
          <Pill tone={progress.satisfied ? "ok" : "warn"}>
            {progress.enteredTotal}/{progress.requirement.total} note
            {progress.requirement.total > 1 ? "s" : ""} requise
            {progress.requirement.total > 1 ? "s" : ""}
          </Pill>
          {!progress.satisfied ? (
            <span className="text-muted-foreground text-sm">
              manque {progress.missingGroup} groupe{progress.missingGroup > 1 ? "s" : ""} +{" "}
              {progress.missingIndividual} individuelle{progress.missingIndividual > 1 ? "s" : ""}
            </span>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost">
              <Link href={`/modules/${id}/project`}>
                {project ? "Modifier le brief" : "Créer le projet"}
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/modules/${id}/assessments/new`}>
                <Plus aria-hidden />
                Nouvelle évaluation
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/modules/${id}/assessments/add`}>Ajouter une évaluation</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/modules/${id}/rattrapages`}>Rattrapages</Link>
            </Button>
            {project ? null : (
              <Button asChild variant="ghost">
                <Link href={`/modules/${id}/project/reuse`}>Partir d’un projet existant</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {cards.length === 0 ? (
        <EmptyState
          title="Pas encore d’évaluation"
          description="Commence par le projet fil rouge : il organise les jalons. Tu peux aussi créer directement une évaluation."
          actions={[
            { label: "Créer le projet", href: `/modules/${id}/project` },
            { label: "Nouvelle évaluation", href: `/modules/${id}/assessments/new` },
          ]}
        />
      ) : (
        <>
          {courses.length > 0 ? (
            <section aria-labelledby="mxt" className={card}>
              <h2 id="mxt" className="font-heading mb-3 text-xl font-bold">
                Séances et évaluations : où chacune tombe
              </h2>
              <div
                role="region"
                aria-label="Frise des séances et des évaluations, défilable"
                tabIndex={0}
                className="focus-visible:ring-ring overflow-x-auto rounded-md focus-visible:ring-2 focus-visible:outline-none"
              >
                <table className="w-full min-w-[44rem] border-separate border-spacing-x-2 border-spacing-y-1.5 text-[0.8rem]">
                  <caption className="sr-only">
                    Quelles séances alimentent quels rendus, évaluation par évaluation
                  </caption>
                  <thead>
                    <tr>
                      <td />
                      {courses.map((c, i) => {
                        const h = courseHeader(
                          {
                            id: c.id,
                            title: c.title,
                            date: c.session_date,
                            toBuild: c.prep_status !== "ready",
                          },
                          i + 1,
                        );
                        return (
                          <th
                            key={c.id}
                            scope="col"
                            className="text-muted-foreground px-1 text-center font-semibold"
                          >
                            Séance {h.number}
                            <br />
                            {h.when}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row" className="py-1 pr-2 text-left align-middle">
                        <strong className="text-sm">Cours</strong>
                        <span className="text-muted-foreground block">Ce que tu enseignes</span>
                      </th>
                      {courses.map((c) => {
                        const l = courseCellLabel({
                          id: c.id,
                          title: c.title,
                          date: c.session_date,
                          toBuild: c.prep_status !== "ready",
                        });
                        return (
                          <td
                            key={c.id}
                            className={`min-h-11 rounded-xl px-2 py-2 text-center ${
                              l.todo ? "text-muted-foreground border border-dashed" : "bg-muted/60"
                            }`}
                          >
                            {l.text}
                          </td>
                        );
                      })}
                    </tr>
                    {timeline.map((row) => {
                      const cells: React.ReactNode[] = [];
                      const sorted: TimelineCell[] = [...row.cells].sort((a, b) => a.col - b.col);
                      let col = 0;
                      for (const cell of sorted) {
                        if (cell.col > col) {
                          cells.push(<td key={`g${col}`} colSpan={cell.col - col} />);
                        }
                        cells.push(
                          <td
                            key={`c${cell.col}`}
                            colSpan={cell.span}
                            className={`rounded-xl px-2 py-2 text-center ${CELL_STYLE[cell.kind]}`}
                          >
                            {cell.label}
                          </td>,
                        );
                        col = cell.col + cell.span;
                      }
                      if (col < courses.length) {
                        cells.push(<td key="rest" colSpan={courses.length - col} />);
                      }
                      return (
                        <tr key={row.assessmentId}>
                          <th scope="row" className="py-1 pr-2 text-left align-middle">
                            <strong className="text-sm">{row.title}</strong>
                            <span className="text-muted-foreground block">{row.subtitle}</span>
                          </th>
                          {row.cells.length ? cells : <td colSpan={courses.length} />}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground mt-3 text-[0.8rem]">
                Un jalon de plus, ou une évaluation individuelle de plus, si tu veux plus de notes
                que les {progress.requirement.total} exigées.
              </p>
            </section>
          ) : null}

          <section aria-labelledby="assessments-list">
            <h2 id="assessments-list" className="font-heading mb-3 text-xl font-bold">
              Évaluations ({assessments.length})
            </h2>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...cards, ...makeups].map((a) => {
                const frame = frameStatus({
                  objective: a.objective,
                  subject: a.subject,
                  deliverableMd: a.deliverable_md,
                  evaluatedMd: a.evaluated_md,
                  isOral: a.project_role === "oral",
                  date: a.date,
                  oralStartTime: a.oral_start_time,
                });
                return (
                  <li key={a.id} className={`${card} flex flex-col`}>
                    <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                      <h3 id={`ev-${a.id}`} className="font-heading min-w-0 text-lg font-bold">
                        <Link
                          href={`/modules/${id}/assessments/${a.id}`}
                          className="focus-visible:ring-ring rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {a.title}
                        </Link>
                      </h3>
                      <Pill>{a.is_group_grade ? "Groupe ×1" : "Individuelle ×3"}</Pill>
                    </div>
                    <p className="text-muted-foreground mb-1 text-[0.8rem]">
                      {a.makeup_of_id ? "Rattrapage · " : ""}
                      {a.project_role ? `${PROJECT_ROLE_LABELS[a.project_role]} · ` : ""}
                      {a.type ? `${a.type} · ` : ""}coefficient {a.coefficient} ·{" "}
                      {a.groups.map((g) => g.name).join(", ") || "—"} · sur {a.maxScore}
                      {a.date ? ` · ${new Date(a.date).toLocaleDateString("fr-FR")}` : ""}
                      {dueSessions.has(a.id) ? "" : ""}
                    </p>
                    <StatusRow label="Cadre pour les étudiant·es" status={frame} />
                    <StatusRow
                      label="Grille de correction"
                      status={gridStatus(a.grading_grid?.name ?? null)}
                    />
                    <StatusRow
                      label="Notes"
                      status={
                        a.gradeCount > 0
                          ? { tone: "ok", label: "Notée" }
                          : { tone: "warn", label: "À noter" }
                      }
                    />
                    <Button
                      asChild
                      variant={frame.tone === "ok" ? "outline" : "default"}
                      className="mt-3 w-full"
                    >
                      <Link
                        href={`/modules/${id}/assessments/${a.id}`}
                        aria-describedby={`ev-${a.id}`}
                      >
                        Préparer
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {averages.length > 0 ? (
        <section aria-labelledby="averages" className={card}>
          <h2 id="averages" className="font-heading mb-3 text-xl font-bold">
            Moyennes pondérées
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="p-2 text-left">
                    Étudiant·e
                  </th>
                  <th scope="col" className="p-2 text-left">
                    Moyenne /20
                  </th>
                </tr>
              </thead>
              <tbody>
                {averages.map(({ student, average }) => (
                  <tr key={student.id} className="border-t">
                    <td className="p-2">
                      <Link
                        href={`/students/${student.id}`}
                        className="underline underline-offset-2"
                      >
                        {student.first_name} {student.last_name}
                      </Link>
                    </td>
                    <td className="p-2">
                      {average.average !== null ? average.average.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            Pondération YNOV : note de groupe ×1, note individuelle ×3. Chaque note est ramenée sur
            20 avant le calcul.
          </p>
        </section>
      ) : null}
    </div>
  );
}
