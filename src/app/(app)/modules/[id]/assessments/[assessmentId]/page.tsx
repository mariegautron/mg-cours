import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileDown, ListChecks, Mic, Pencil, Presentation } from "lucide-react";

import {
  buildSessionSections,
  toObservationLines,
} from "@/app/(app)/modules/[id]/assessments/grading-sections";
import { CorrectionOverview } from "@/components/assessments/correction-overview";
import { DownloadButton } from "@/components/download-button";
import { correctionOverview } from "@/lib/assessments/overview";
import { DeleteAssessmentButton } from "@/components/assessments/delete-buttons";
import { Submissions } from "@/components/assessments/submissions";
import { GradingSession } from "@/components/assessments/grading-session";
import { Markdown } from "@/components/markdown";
import { MakeupPanel } from "@/components/assessments/makeup-panel";
import { SubmissionItems } from "@/components/assessments/submission-items";
import { groupByOwner } from "@/lib/projects/submission-items";
import { listSubmissionItems } from "@/lib/projects/submission-queries";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import {
  getAssessment,
  getGradesByAssessment,
  listComments,
  listGroupGradeMembers,
} from "@/lib/assessments/queries";
import { frameStatus } from "@/lib/assessments/module-overview";
import { formatNumber, groupByAxis } from "@/lib/assessments/scoring";
import { excusedStudentIds } from "@/lib/assessments/makeup";
import { gradingTargets } from "@/lib/assessments/targets";
import { assessmentFileUrl } from "@/lib/assessments/files";
import { isOralAssessment } from "@/lib/assessments/oral";
import { canPresent, PREP_STATUS_LABELS, subjectSections } from "@/lib/assessments/subject";
import { submissionSummary, type SubmissionRow } from "@/lib/projects/submission";
import { createClient } from "@/lib/supabase/server";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { parseResourceFiles } from "@/lib/resources/files";
import { themeTitleByGroup } from "@/lib/projects/queries";
import { listModuleObservations } from "@/lib/notebook/queries";

type AssessmentGroups = NonNullable<Awaited<ReturnType<typeof getAssessment>>>["groups"];

async function loadSubmissionRows(assessmentId: string, groups: AssessmentGroups) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_submission")
    .select("student_group_id, received_on, url")
    .eq("assessment_id", assessmentId);
  return groups.map((g): SubmissionRow => {
    const r = data?.find((x) => x.student_group_id === g.id);
    return {
      groupId: g.id,
      groupName: g.name,
      receivedOn: r?.received_on ?? null,
      url: r?.url ?? null,
    };
  });
}

async function loadMakeupInfo(
  assessment: NonNullable<Awaited<ReturnType<typeof getAssessment>>>,
  assessmentId: string,
): Promise<{
  original: { id: string; title: string } | null;
  panel: { existing: { id: string; title: string; enrolled: number } | null } | null;
}> {
  const supabase = await createClient();
  if (assessment.makeup_of_id) {
    const { data } = await supabase
      .from("assessment")
      .select("id, title")
      .eq("id", assessment.makeup_of_id)
      .maybeSingle();
    return { original: data, panel: null };
  }
  if (assessment.is_group_grade) return { original: null, panel: null };
  const { data: existing } = await supabase
    .from("assessment")
    .select("id, title")
    .eq("makeup_of_id", assessmentId)
    .maybeSingle();
  const { count } = existing
    ? await supabase
        .from("assessment_student")
        .select("id", { count: "exact", head: true })
        .eq("assessment_id", existing.id)
    : { count: 0 };
  return {
    original: null,
    panel: { existing: existing ? { ...existing, enrolled: count ?? 0 } : null },
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]">): Promise<Metadata> {
  const { assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  return { title: assessment?.title ?? "Évaluation" };
}

export default async function AssessmentPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]">) {
  const { id, assessmentId } = await params;
  const [assessment, grades, comments, mod, moduleObservations, courses] = await Promise.all([
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
    listComments(),
    getModule(id),
    listModuleObservations(id),
    getModuleCourses(id),
  ]);
  if (!assessment || assessment.module_id !== id) notFound();

  const memberNames = new Map(
    assessment.groups.flatMap((g) =>
      g.members.map((m) => [m.id, `${m.first_name} ${m.last_name}`] as const),
    ),
  );
  const hasGrades = grades.some((g) => g.value !== null);
  // Les six lectures suivantes ne dépendent que de l'évaluation et des notes : en parallèle.
  const [overrideRows, themes, submissionRows, makeup, submissionData] = await Promise.all([
    listGroupGradeMembers(grades.filter((g) => g.student_group_id).map((g) => g.id)),
    themeTitleByGroup(assessment.project_id),
    // Suivi des rendus (US-93) : seulement pour les évaluations d'un projet.
    assessment.project_id ? loadSubmissionRows(assessmentId, assessment.groups) : [],
    // Rattrapage (US-96) : sur une évaluation individuelle, pour les absent·es excusé·es ; sur
    // un rattrapage, rappel de l'originale.
    loadMakeupInfo(assessment, assessmentId),
    listSubmissionItems(assessmentId),
  ]);
  let makeupPanel: React.ReactNode = null;
  const makeupOf = makeup.original;
  if (makeup.panel) {
    makeupPanel = (
      <MakeupPanel
        moduleId={id}
        assessmentId={assessmentId}
        excused={excusedStudentIds(grades).map((sid) => memberNames.get(sid) ?? "Étudiant·e")}
        makeup={makeup.panel.existing}
      />
    );
  }
  const targets = gradingTargets(assessment.is_group_grade, assessment.groups);
  // Observations de cours (carnet) : consultables pendant la correction, jamais exportées.
  const observations = toObservationLines(moduleObservations);
  const sections = buildSessionSections({
    moduleId: id,
    assessment,
    grades,
    overrideRows,
    observations,
    themes,
    submissions: submissionData.available ? groupByOwner(submissionData.items) : undefined,
  });
  const overview = correctionOverview(
    sections.flatMap((section) =>
      section.items.map((item) => ({
        id: item.id,
        title: item.title,
        // Note individuelle : le groupe de la personne ; note de groupe : le thème du projet.
        context: assessment.is_group_grade ? item.theme : section.title,
        members: item.members?.map((m) => m.name),
        grade: item.grade ?? null,
      })),
    ),
    (assessment.grading_grid?.criteria ?? []).map((c) => c.id),
    assessment.auto_validated_criterion_ids,
  );
  const groupNames = assessment.groups.map((g) => g.name).join(", ");
  const subjectParts = subjectSections(assessment);
  const files = parseResourceFiles(assessment.files);
  const courseIndex = courses.findIndex((c) => c.id === assessment.course_id);
  const course = courseIndex === -1 ? null : courses[courseIndex];
  const courseNumber = courseIndex + 1;

  const grid = assessment.grading_grid;
  const gridGroups = grid ? groupByAxis(grid.criteria, grid.axes) : [];
  const gridTotal = grid
    ? Math.round(grid.criteria.filter((c) => !c.is_bonus).reduce((n, c) => n + c.weight, 0) * 100) /
      100
    : 0;
  const frame = frameStatus({
    objective: assessment.objective,
    subject: assessment.subject,
    deliverableMd: assessment.deliverable_md,
    evaluatedMd: assessment.evaluated_md,
    isOral: assessment.project_role === "oral",
    date: assessment.date,
    oralStartTime: assessment.oral_start_time,
  });
  const blank = (v: string | null) => !v || !v.trim();
  const frameChecks: [string, boolean][] = [
    ["Quoi", !blank(assessment.objective) || !blank(assessment.subject)],
    ["Quand", !!assessment.date || !!course],
    ["Avec qui", assessment.groups.length > 0],
    ["À rendre", !blank(assessment.deliverable_md)],
    ["Comment c’est noté", !blank(assessment.evaluated_md) || !!grid],
  ];
  // Combien de modules utilisent cette grille (la modifier les touche tous).
  let gridModules = 0;
  if (grid) {
    const supabase = await createClient();
    const { data: using } = await supabase
      .from("assessment")
      .select("module_id")
      .eq("grading_grid_id", grid.id);
    gridModules = new Set((using ?? []).map((u) => u.module_id)).size;
  }
  const card = "bg-card rounded-3xl border p-5 shadow-sm";
  const toneOf = { ok: "ok", warn: "warn", build: "warn" } as const;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Évaluations
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">{assessment.title}</h1>
          <p className="text-muted-foreground mt-1">
            {[
              assessment.project_role ? "Projet fil rouge" : null,
              assessment.type,
              assessment.is_group_grade ? "groupe ×1" : "individuelle ×3",
              groupNames,
              course ? `rendu séance ${courseNumber}` : null,
              assessment.date ? new Date(assessment.date).toLocaleDateString("fr-FR") : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            {assessment.project_id ? (
              <>
                {" "}
                ·{" "}
                <Link
                  href={`/modules/${id}/project`}
                  className="text-primary underline underline-offset-2"
                >
                  voir le brief
                </Link>
              </>
            ) : null}
          </p>
          {makeupOf ? (
            <p className="mt-1 text-sm">
              Rattrapage de{" "}
              <Link
                href={`/modules/${id}/assessments/${makeupOf.id}`}
                className="underline underline-offset-2"
              >
                {makeupOf.title}
              </Link>{" "}
              pour : {Array.from(memberNames.values()).join(", ") || "personne pour l’instant"}.
              Même grille, même coefficient : sa note remplace l’absence excusée.
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>Coefficient {assessment.coefficient}</Pill>
            <Pill>Sur {assessment.maxScore}</Pill>
            <Pill>{assessment.is_group_grade ? "Note de groupe" : "Note individuelle"}</Pill>
            {grid ? <Pill tone="key">{grid.name}</Pill> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!assessment.is_group_grade ? (
            <Button asChild variant="secondary">
              <Link href={`/modules/${id}/assessments/${assessmentId}/quiz`}>
                <ListChecks aria-hidden />
                QCM en ligne
              </Link>
            </Button>
          ) : null}
          {isOralAssessment(assessment) ? (
            <Button asChild>
              <Link href={`/modules/${id}/assessments/${assessmentId}/oral`}>
                <Mic aria-hidden />
                Faire passer l’oral
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="secondary">
            <Link href={`/modules/${id}/assessments/${assessmentId}/edit`}>
              <Pencil aria-hidden />
              Modifier
            </Link>
          </Button>
          <DeleteAssessmentButton moduleId={id} assessmentId={assessmentId} />
          <Button asChild variant="ghost">
            <Link href={`/modules/${id}/assessments`}>← Les évaluations</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
        <section
          aria-labelledby="gr"
          className={`${card} w-full min-w-0 flex-1 space-y-4 lg:basis-0`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="gr" className="font-heading text-xl font-bold">
              Grille de correction
            </h2>
            {grid ? <Pill tone="ok">{formatNumber(gridTotal)} points</Pill> : null}
          </div>
          {grid ? (
            <>
              <p className="text-muted-foreground text-sm">
                Chaque critère a ses paliers. Les étudiant·es la reçoivent avant le travail.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="ghost">
                  <Link href={`/modules/${id}/assessments/${assessmentId}/edit`}>
                    Reprendre une grille existante
                  </Link>
                </Button>
                {canPresent(assessment.prep_status) ? (
                  <DownloadButton
                    href={`/api/modules/${id}/assessments/${assessmentId}/grid`}
                    icon={<FileDown aria-hidden />}
                    doneLabel="Grille téléchargée."
                  >
                    Grille pour les étudiant·es (PDF)
                  </DownloadButton>
                ) : (
                  <p className="text-muted-foreground self-center text-sm">
                    La grille se remet aux étudiant·es une fois le sujet « Prête » ou « Fournie ».
                  </p>
                )}
              </div>
              {gridGroups.map((g, gi) => (
                <div key={g.axis?.id ?? `loose-${gi}`} className="space-y-2">
                  {g.axis ? (
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <strong>Axe · {g.axis.label}</strong>
                      <span className="text-muted-foreground text-sm">
                        {formatNumber(
                          g.criteria.filter((c) => !c.is_bonus).reduce((n, c) => n + c.weight, 0),
                        )}{" "}
                        points
                      </span>
                    </div>
                  ) : null}
                  {g.criteria.map((c) => (
                    <div key={c.id} className="rounded-2xl border p-3">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <strong>
                          {c.label}
                          {c.is_bonus ? " (bonus)" : ""}
                        </strong>
                        <span className="text-muted-foreground text-sm">
                          {formatNumber(c.weight)} point{c.weight > 1 ? "s" : ""}
                        </span>
                      </div>
                      {c.levels.length > 0 ? (
                        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          {c.levels.map((l) => (
                            <li key={l.id} className="bg-muted/40 rounded-xl p-2.5 text-sm">
                              <strong>{formatNumber(l.points)} pts</strong>
                              <span className="text-muted-foreground block text-[0.8rem]">
                                {l.description}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Saisie libre des points, de 0 à {formatNumber(c.weight)}.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3 border-t pt-3">
                <Pill tone={gridTotal === assessment.maxScore ? "ok" : "warn"}>
                  <span role="status">
                    Total {formatNumber(gridTotal)} sur {formatNumber(assessment.maxScore)}
                  </span>
                </Pill>
                <span className="text-muted-foreground text-sm">
                  Un bonus est plafonné : la note ne dépasse jamais le barème.
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                Pas de grille pour l’instant : la note se saisit directement, sur{" "}
                {formatNumber(assessment.maxScore)}. Une grille donne des critères et des paliers à
                la correction, et se remet aux étudiant·es avant le travail.
              </p>
              <Button asChild>
                <Link href={`/modules/${id}/assessments/${assessmentId}/edit`}>
                  Choisir ou reprendre une grille
                </Link>
              </Button>
            </div>
          )}
        </section>

        <aside
          aria-label="Préparation de l’évaluation"
          className="w-full min-w-0 space-y-4 lg:w-[26rem] lg:flex-none"
        >
          <section aria-labelledby="ce" className={card}>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <h2 id="ce" className="font-heading text-xl font-bold">
                Le cadre pour les étudiant·es
              </h2>
              <Pill tone={toneOf[frame.tone]} className="whitespace-normal">
                {frame.label}
              </Pill>
            </div>
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {frameChecks.map(([label, ok]) => (
                <li key={label}>
                  <Pill tone={ok ? "ok" : "warn"}>
                    {ok ? "✓" : "!"} {label}
                    <span className="sr-only"> : {ok ? "renseigné" : "à renseigner"}</span>
                  </Pill>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={assessment.prep_status === "to_build" ? "warn" : "ok"}>
                {PREP_STATUS_LABELS[assessment.prep_status]}
              </Pill>
              <Button asChild variant="ghost">
                <Link href={`/modules/${id}/assessments/${assessmentId}/edit`}>
                  Modifier le cadre
                </Link>
              </Button>
              {canPresent(assessment.prep_status) ? (
                <Button asChild variant="ghost">
                  <Link href={`/present/modules/${id}/assessments/${assessmentId}`}>
                    <Presentation aria-hidden />
                    Présenter le sujet
                  </Link>
                </Button>
              ) : null}
            </div>
            {canPresent(assessment.prep_status) ? null : (
              <p className="text-muted-foreground mt-2 text-sm">
                Le sujet se projette une fois « Prête » ou « Fournie ».
              </p>
            )}
            {course ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Séance {courseNumber} — {course.title}
              </p>
            ) : null}
            <p className="text-muted-foreground mt-2 text-[0.8rem]">
              Rempli une fois : les réponses connues (séance, groupes, type de note) sont
              préremplies.
            </p>
          </section>

          <section aria-labelledby="ae" className={card}>
            <h2 id="ae" className="font-heading mb-1.5 text-xl font-bold">
              Ce qu’on évalue
            </h2>
            {blank(assessment.evaluated_md) ? (
              <p className="text-muted-foreground text-sm">
                Pas encore renseigné : dis dans le cadre ce qui sera évalué.
              </p>
            ) : (
              <Markdown source={assessment.evaluated_md ?? ""} />
            )}
          </section>

          <section aria-labelledby="cr" className={card}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 id="cr" className="font-heading text-xl font-bold">
                Pour la correction
              </h2>
              <Pill tone="warn">Toi seule</Pill>
            </div>
            <div className="flex items-center justify-between gap-3 border-t py-2 text-sm">
              <span>{assessment.is_group_grade ? "Groupes" : "Étudiant·es"} à noter</span>
              <strong>
                {assessment.is_group_grade
                  ? targets.length
                  : targets.reduce((n, t) => n + t.students.length, 0)}
              </strong>
            </div>
            <Button asChild variant="ghost">
              <Link href="/assessments/comments">Mes phrases pour cette grille</Link>
            </Button>
          </section>

          {grid ? (
            <section aria-labelledby="ut" className={card}>
              <h2 id="ut" className="font-heading mb-1.5 text-xl font-bold">
                Utilisée dans {gridModules} module{gridModules > 1 ? "s" : ""}
              </h2>
              <p className="text-muted-foreground text-sm">
                {gridModules > 1
                  ? "Si tu modifies la grille alors qu’elle sert ailleurs, elle change pour tous ces modules."
                  : "Cette grille ne sert que dans ce module."}
              </p>
            </section>
          ) : null}
        </aside>
      </div>

      <section aria-labelledby="subject" className={`${card} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="subject" className="font-heading text-xl font-bold">
            Sujet
          </h2>
        </div>

        {subjectParts.length === 0 && files.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucun sujet rédigé : ouvre « Modifier » pour ajouter l’objectif, la consigne et le rendu
            attendu.
          </p>
        ) : null}

        {subjectParts.map((part) => (
          <div key={part.key}>
            <h3 className="mb-1 font-bold">{part.heading}</h3>
            {part.markdown ? <Markdown source={part.text} /> : <p>{part.text}</p>}
          </div>
        ))}

        {files.length > 0 ? (
          <div>
            <h3 className="mb-1 font-bold">Fichiers joints</h3>
            <ul className="space-y-1 text-sm">
              {files.map((f) => (
                <li key={f.path}>
                  <a
                    href={assessmentFileUrl(assessmentId, f.name)}
                    download
                    className="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    <Download aria-hidden className="size-4" />
                    {f.name}
                    <span className="sr-only"> (télécharger)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {assessment.project_id && submissionRows.length > 0 ? (
        <section aria-labelledby="submissions" className="space-y-3">
          <h2 id="submissions" className="text-lg font-medium">
            Rendus — {submissionSummary(submissionRows)}
          </h2>
          <Submissions moduleId={id} assessmentId={assessmentId} rows={submissionRows} />
        </section>
      ) : null}

      {submissionData.available && targets.length > 0 ? (
        <section aria-labelledby="rendus" className="space-y-3">
          <h2 id="rendus" className="text-lg font-medium">
            Rendus déposés
          </h2>
          <p className="text-muted-foreground text-sm">
            Plusieurs fichiers ou liens par {assessment.is_group_grade ? "groupe" : "étudiant·e"},
            ajoutés par toi. Ils s’ouvrent aussi depuis la copie à corriger.
          </p>
          <SubmissionItems
            moduleId={id}
            assessmentId={assessmentId}
            rows={(() => {
              const byOwner = groupByOwner(submissionData.items);
              return assessment.is_group_grade
                ? targets.map(({ group }) => ({
                    owner: { kind: "group" as const, id: group.id },
                    name: group.name,
                    items: byOwner.get(group.id) ?? [],
                  }))
                : targets.flatMap(({ students }) =>
                    students.map((s) => ({
                      owner: { kind: "student" as const, id: s.id },
                      name: `${s.first_name} ${s.last_name}`,
                      items: byOwner.get(s.id) ?? [],
                    })),
                  );
            })()}
          />
        </section>
      ) : null}

      {makeupPanel}

      {hasGrades ? (
        <section aria-labelledby="send" className="bg-card space-y-2 rounded-xl border p-5">
          <h2 id="send" className="text-lg font-semibold">
            Envoyer les résultats
          </h2>
          <p className="text-muted-foreground text-sm">
            Vérifie, puis publie par lien personnel, exporte ou envoie par e-mail : rien ne part
            sans ta confirmation.
          </p>
          <Button asChild variant="secondary" size="touch">
            <Link href={`/modules/${id}/assessments/${assessmentId}/results`}>
              Envoyer les résultats
            </Link>
          </Button>
        </section>
      ) : null}

      {targets.length === 0 ? (
        <p className="text-muted-foreground">Aucun groupe visé : modifie l’évaluation.</p>
      ) : (
        <>
          <CorrectionOverview
            overview={overview}
            maxScore={assessment.maxScore}
            noun={assessment.is_group_grade ? "groupe" : "étudiant·e"}
            compareHref={
              (assessment.grading_grid?.criteria.length ?? 0) > 0
                ? `/modules/${id}/assessments/${assessmentId}/compare`
                : null
            }
          />
          <GradingSession
            sections={sections}
            grid={assessment.grading_grid}
            maxScore={assessment.maxScore}
            comments={comments}
            autoValidatedIds={assessment.auto_validated_criterion_ids}
            subject={mod?.name ?? null}
            absenceRule={await getAbsenceRuleForModule(id)}
          />
        </>
      )}
    </div>
  );
}
