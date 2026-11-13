import { appliedCoefficient } from "@/lib/ynov/notation";
import { assessmentKindOf, kindBlocks, kindOption } from "@/lib/assessments/kind";
import { IncompletePublishedWarning } from "@/components/assessments/incomplete-published-warning";
import { incompleteCopies, publishedIncomplete } from "@/lib/assessments/incomplete";
import { activeSpaceStudentIds } from "@/lib/modules/frise-queries";
import { RepublishNotice } from "@/components/assessments/republish-notice";
import { listResultLinks } from "@/lib/result-links/queries";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ClipboardCheck,
  Download,
  FileDown,
  ListChecks,
  Mic,
  Pencil,
  Presentation,
} from "lucide-react";

import {
  buildSessionSections,
  toObservationLines,
} from "@/app/(app)/modules/[id]/assessments/grading-sections";
import { CorrectionOverview } from "@/components/assessments/correction-overview";
import { expectationsCitedByCriteria } from "@/lib/modules/expectation-coverage";
import { AssessmentExpectations } from "@/components/assessments/assessment-expectations";
import { listAssessmentExpectations } from "@/lib/assessments/expectation-queries";
import { BonusSettings } from "@/components/assessments/bonus-settings";
import { parseScale } from "@/lib/assessments/score-scale";
import { WhereToSubmit } from "@/components/assessments/where-to-submit";
import { ExamKindForm } from "@/components/assessments/exam-kind-form";
import { DownloadButton } from "@/components/download-button";
import { correctionOverview } from "@/lib/assessments/overview";
import { DeleteAssessmentButton } from "@/components/assessments/delete-buttons";
import { getQuizByAssessment, listAttempts } from "@/lib/quiz/queries";
import { Markdown } from "@/components/markdown";
import { MakeupPanel } from "@/components/assessments/makeup-panel";
import { MarkDepositsSeen } from "@/components/assessments/mark-deposits-seen";
import { SubmitSettings } from "@/components/assessments/submit-settings";
import { deadlineOf } from "@/lib/deposits/rules";
import { SubmissionItems } from "@/components/assessments/submission-items";
import { groupByOwner } from "@/lib/projects/submission-items";
import { listSubmissionItems } from "@/lib/projects/submission-queries";
import { Pill, Status } from "@/components/dashboard/pill";
import { OpenInWindowButton } from "@/components/present/open-in-window-button";
import { DayJBlock } from "@/components/assessments/day-j-block";
import { dayJReadiness, espaceUpToDate, submitModeOf } from "@/lib/assessments/day-j";
import { loadDayJExtras } from "@/lib/assessments/day-j-queries";
import { SubjectStatusBadge } from "@/components/assessments/subject-status-badge";
import { Button } from "@/components/ui/button";
import {
  getAssessment,
  getGradesByAssessment,
  listGroupGradeMembers,
} from "@/lib/assessments/queries";
import { examKindOf, individualFrame, parseSubjectVersions } from "@/lib/assessments/exam-kind";
import { frameStatus } from "@/lib/assessments/module-overview";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { isProgressReview, isUngradedReview } from "@/lib/assessments/progress-review";
import { formatNumber, groupByAxis } from "@/lib/assessments/scoring";
import { excusedStudentIds } from "@/lib/assessments/makeup";
import { gradingTargets } from "@/lib/assessments/targets";
import { assessmentFileUrl } from "@/lib/assessments/files";
import { isOralAssessment } from "@/lib/assessments/oral";
import { oralCoversAllGroups } from "@/lib/assessments/oral-slots";
import { loadMakeupGroups, makeupHrefs } from "@/lib/assessments/makeup-queries";
import { OralTimingForm } from "@/components/assessments/oral-timing-form";
import { canPresent, subjectSections } from "@/lib/assessments/subject";
import { createClient } from "@/lib/supabase/server";
import { todayInParis } from "@/lib/modules/next-session";
import { getModuleCourses, getModuleExpectations } from "@/lib/modules/queries";
import { parseResourceFiles } from "@/lib/resources/files";
import { themeTitleByGroup } from "@/lib/projects/queries";
import { listModuleObservations } from "@/lib/notebook/queries";

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
  searchParams,
}: PageProps<"/modules/[id]/assessments/[assessmentId]">) {
  const { id, assessmentId } = await params;
  const justSaved = (await searchParams).enregistre === "1";
  const [
    assessment,
    grades,
    moduleObservations,
    courses,
    moduleExpectations,
    evaluatedExpectations,
    { grading },
  ] = await Promise.all([
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
    listModuleObservations(id),
    getModuleCourses(id),
    getModuleExpectations(id),
    listAssessmentExpectations([assessmentId]),
    getSchoolRulesForModule(id),
  ]);
  if (!assessment || assessment.module_id !== id) notFound();
  // Coefficient réellement utilisé par la moyenne : imposé par l'école, sinon la règle du module.
  const ruleCoefficient = appliedCoefficient(
    assessment.is_group_grade,
    assessment.coefficient_override,
    grading,
  );

  const memberNames = new Map(
    assessment.groups.flatMap((g) =>
      g.members.map((m) => [m.id, `${m.first_name} ${m.last_name}`] as const),
    ),
  );
  const hasGrades = grades.some((g) => g.value !== null);
  // Les lectures suivantes ne dépendent que de l'évaluation et des notes : en parallèle.
  const [overrideRows, themes, makeup, submissionData] = await Promise.all([
    listGroupGradeMembers(grades.filter((g) => g.student_group_id).map((g) => g.id)),
    themeTitleByGroup(assessment.project_id),
    // Rattrapage (US-96) : sur une évaluation individuelle, pour les absent·es excusé·es ; sur
    // un rattrapage, rappel de l'originale.
    loadMakeupInfo(assessment, assessmentId),
    listSubmissionItems(assessmentId),
  ]);
  let makeupPanel: React.ReactNode = null;
  const makeupOf = makeup.original;
  // « Copiée de » : évaluation reprise d'un autre module (« Reprise : à relire » tant que pas enregistrée).
  const { data: copiedFrom } = assessment.copied_from_id
    ? await (
        await createClient()
      )
        .from("assessment")
        .select("id, title, module_id, module:module_id(name)")
        .eq("id", assessment.copied_from_id)
        .maybeSingle()
    : { data: null };
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
  // Type d'évaluation unique (lot 5) : seuls les blocs utiles à ce type sont affichés (une Note de
  // l'école : la saisie des notes, le coefficient imposé et l'essentiel).
  // Rattrapage : il a le type de l'évaluation qu'il rattrape (une étude de cas reste une étude de
  // cas, même si son QCM est enregistré autrement).
  const original = makeupOf
    ? (
        await (
          await createClient()
        )
          .from("assessment")
          .select("kind, type, exam_kind, title")
          .eq("id", makeupOf.id)
          .maybeSingle()
      ).data
    : null;
  const kindNow = assessmentKindOf(original ?? assessment);
  const blocks = kindBlocks(kindNow);
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
    // Bande « Rendu » de la copie : seulement quand un rendu est attendu (type de l'évaluation).
    submissions:
      submissionData.available && blocks.submissions
        ? groupByOwner(submissionData.items)
        : undefined,
  });
  // Copie excusée : « Voir son rattrapage » quand il est déjà préparé.
  const makeupLinks = await makeupHrefs(id, assessmentId);
  for (const item of sections.flatMap((sec) => sec.items))
    (item as { makeupHref?: string | null }).makeupHref = makeupLinks.get(item.id) ?? null;
  const quiz = assessment.is_group_grade ? null : await getQuizByAssessment(assessmentId);
  // Un seul chemin pour corriger, selon le type : l'oral se corrige dans « Faire passer l'oral »
  // (quand chaque groupe a son créneau), un QCM se relit dans son suivi.
  const isOral = isOralAssessment(assessment);
  const oralCovers =
    isOral &&
    (assessment.grading_grid?.criteria.length ?? 0) > 0 &&
    (await oralCoversAllGroups(
      assessmentId,
      assessment.groups.map((g) => g.id),
    ));
  const quizReview = !!quiz && quiz.correction_mode !== "open_questions";
  const quizSubmitted = quiz
    ? new Set(
        (await listAttempts(quiz.id))
          .filter((a) => a.status === "submitted")
          .map((a) => a.studentId),
      )
    : null;
  // Absences excusées : où en est le rattrapage de chaque personne (même calcul que la page Rattrapages).
  const makeupGroup = (await loadMakeupGroups(id)).find((g) => g.assessment.id === assessmentId);
  const makeupGrades = makeupGroup?.makeup
    ? await getGradesByAssessment(makeupGroup.makeup.id, { skipRewrite: true })
    : [];
  const makeupFor = (studentId: string) => {
    const row = makeupGroup?.rows.find((r) => r.student.id === studentId);
    if (!row) return null;
    const mk = makeupGroup!.makeup;
    if (row.step === "done" && mk) {
      const v = makeupGrades.find((g) => g.student_id === studentId)?.value;
      return {
        label: `Rattrapé·e${v != null ? ` · ${v.toLocaleString("fr-FR")}/${assessment.maxScore}` : ""}`,
        href: `/modules/${id}/assessments/${mk.id}`,
      };
    }
    if (mk && row.step === "to_enroll")
      return { label: "Excusé·e · à inscrire au rattrapage", href: `/modules/${id}/rattrapages` };
    return mk
      ? { label: "Excusé·e · rattrapage préparé", href: `/modules/${id}/assessments/${mk.id}` }
      : { label: "Excusé·e · rattrapage à prévoir", href: `/modules/${id}/rattrapages` };
  };
  const overview = correctionOverview(
    sections.flatMap((section) =>
      section.items.map((item) => ({
        id: item.id,
        title: item.title,
        // Note individuelle : le groupe de la personne ; note de groupe : le thème du projet.
        context: assessment.is_group_grade ? item.theme : section.title,
        members: item.members?.map((m) => m.name),
        grade: item.grade ?? null,
        // Rendus suivis seulement pour une évaluation individuelle : copie de QCM rendue, ou
        // fichiers et liens déposés quand ils sont lisibles.
        received: quizSubmitted
          ? quizSubmitted.has(item.id)
          : !assessment.is_group_grade && submissionData.available && blocks.submissions
            ? (item.submissions?.length ?? 0) > 0
            : undefined,
        attendance: item.grade?.attendance ?? null,
        makeup: makeupFor(item.id),
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
  // Oral : heure de début et durée par groupe, réglables la veille depuis la préparation.
  const oralTiming = isOralAssessment(assessment) ? (
    <section aria-labelledby="oral-timing" className="bg-card rounded-xl border p-5 shadow-sm">
      <h2 id="oral-timing" className="mb-2 text-sm font-semibold">
        Horaires de l’oral
      </h2>
      <OralTimingForm
        moduleId={id}
        assessmentId={assessmentId}
        startTime={assessment.oral_start_time?.slice(0, 5) ?? null}
        durationMinutes={assessment.duration_minutes}
        courseStart={course?.start_time?.slice(0, 5) ?? null}
      />
    </section>
  ) : null;
  const frameBase = frameStatus({
    hasDate: !!assessment.date || !!course?.session_date,
    whereOk:
      ["qcm", "oral", "in_class"].includes(examKindOf(assessment)) ||
      submitModeOf(assessment) === "app" ||
      !!assessment.where_to_submit?.trim(),
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
    ["Quand", !!assessment.date || !!course?.session_date],
    ["Avec qui", assessment.groups.length > 0],
    [
      "À rendre",
      !blank(assessment.deliverable_md) &&
        (examKindOf(assessment) !== "files" ||
          submitModeOf(assessment) === "app" ||
          !blank(assessment.where_to_submit)),
    ],
    ["Comment c’est noté", !blank(assessment.evaluated_md) || !!grid],
  ];
  // « Complet » seulement si toutes les lignes du cadre sont cochées.
  const frameMissing = frameChecks.filter(([, ok]) => !ok).map(([label]) => label.toLowerCase());
  const frame =
    frameBase.tone === "ok" && frameMissing.length > 0
      ? { tone: "build" as const, label: `À compléter : ${frameMissing.join(", ")}` }
      : frameBase;
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
  const dayJExtras = await loadDayJExtras(id, [assessmentId]);
  const dayJTop = dayJReadiness({
    moduleId: id,
    id: assessmentId,
    title: assessment.title,
    date: assessment.date,
    courseId: assessment.course_id,
    courseDate: course?.session_date ?? null,
    prepStatus: assessment.prep_status,
    objective: assessment.objective,
    subject: assessment.subject,
    deliverableMd: assessment.deliverable_md,
    evaluatedMd: assessment.evaluated_md,
    gradingGridId: assessment.grading_grid_id,
    groupCount: assessment.groups.length,
    isGroupGrade: assessment.is_group_grade,
    examKind: assessment.exam_kind,
    type: assessment.type,
    whereToSubmit: assessment.where_to_submit,
    files: assessment.files,
    isOral: assessment.project_role === "oral",
    published: dayJExtras.published
      ? espaceUpToDate(dayJExtras.published.get(assessmentId), {
          ...assessment,
          submit_mode: submitModeOf(assessment),
        })
      : undefined,
    submitMode: submitModeOf(assessment),
    qcm: dayJExtras.qcm.get(assessmentId),
  });
  const card = "bg-card rounded-xl border p-4";
  // Une fois la date passée (ou des notes saisies), on vient pour les copies : elles passent en haut,
  // la préparation (cadre, sujet, grille, attendus) se replie sous un sommaire (lot 0 E, points 35-36).
  // Un rattrapage : on vient pour la (les) copie(s) de la personne excusée, en haut tout de suite.
  const copiesFirst =
    targets.length > 0 &&
    (!!assessment.makeup_of_id ||
      hasGrades ||
      (() => {
        const day = assessment.date ?? course?.session_date ?? null;
        return !!day && day.slice(0, 10) <= todayInParis();
      })());
  // « Attendus évalués » : dans les deux mises en page (note de groupe et individuelle).
  const evaluatedSection = (
    <section aria-labelledby="at" className={card}>
      <h2 id="at" className="mb-1.5 text-sm font-semibold">
        Attendus évalués
      </h2>
      <p className="text-muted-foreground mb-2 text-sm">Choisis ceux que l’épreuve vérifie.</p>
      <AssessmentExpectations
        moduleId={id}
        assessmentId={assessmentId}
        expectations={moduleExpectations.map((e) => ({ id: e.id, label: e.label }))}
        initialIds={evaluatedExpectations.byAssessment.get(assessmentId) ?? []}
        available={evaluatedExpectations.available}
        suggestedIds={expectationsCitedByCriteria(
          (assessment.grading_grid?.criteria ?? []).map((c) => c.reference),
          moduleExpectations.map((e) => ({ id: e.id, label: e.label })),
        )}
      />
    </section>
  );
  const toneOf = { ok: "ok", warn: "warn", build: "warn" } as const;

  // Toutes les copies commencées ont une note : l'envoi des résultats passe en haut de la page.
  // Notes modifiées après leur publication : l'espace montre encore l'ancienne version.
  const assessmentGroups = assessment.groups;
  async function changedSincePublication(): Promise<string[]> {
    if (!hasGrades) return [];
    const links = (await listResultLinks(assessmentId)).byStudent;
    if (links.size === 0) return [];
    const out: string[] = [];
    for (const g of grades) {
      if (g.value === null) continue;
      const people = g.student_group_id
        ? (assessmentGroups.find((x) => x.id === g.student_group_id)?.members ?? [])
        : targets.flatMap(({ students }) => students).filter((st) => st.id === g.student_id);
      for (const st of people) {
        const link = links.get(st.id);
        if (link && new Date(g.updated_at).getTime() > new Date(link.published_at).getTime()) {
          out.push(`${st.first_name} ${st.last_name}`);
        }
      }
    }
    return out;
  }
  const readyToSend = hasGrades && incompleteCopies(grades, assessment.groups).length === 0;
  // Notes qui n'arriveront pas dans un espace : la personne n'a pas (ou plus) de lien d'espace actif.
  const spaceIds = hasGrades ? await activeSpaceStudentIds(id) : new Set<string>();
  const noSpace = hasGrades
    ? targets
        .flatMap(({ students }) => students)
        .filter((st) => !spaceIds.has(st.id))
        .map((st) => `${st.first_name} ${st.last_name}`)
    : [];

  const copiesSection = (
    <section id="copies" aria-label="Copies" className="scroll-mt-4">
      {targets.length === 0 ? (
        <p className="text-muted-foreground">Aucun groupe visé : modifie l’évaluation.</p>
      ) : (
        <>
          <CorrectionOverview
            overview={overview}
            maxScore={assessment.maxScore}
            noun={assessment.is_group_grade ? "groupe" : "étudiant·e"}
            correctHref={`/modules/${id}/assessments/${assessmentId}/correct`}
            phrasesHref={
              (assessment.grading_grid?.criteria.length ?? 0) > 0 ? "/assessments/comments" : null
            }
            compareHref={
              (assessment.grading_grid?.criteria.length ?? 0) > 0
                ? `/modules/${id}/assessments/${assessmentId}/correct?vue=critere`
                : null
            }
          />
        </>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-[112rem] space-y-5">
      {justSaved ? (
        <p
          role="status"
          className="border-success/40 text-success rounded-xl border p-3 text-sm font-medium"
        >
          Évaluation enregistrée.
        </p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1>{assessment.title}</h1>
          <p className="text-muted-foreground mt-1">
            {[
              assessment.project_role ? "Projet fil rouge" : null,
              // Libellé du type unique ; l'ancien texte seulement si `kind` est vide.
              assessment.kind ? kindOption(kindNow).label : assessment.type,
              isUngradedReview(assessment)
                ? "point d’étape · sans note"
                : `${assessment.is_group_grade ? "groupe" : "individuelle"} ×${ruleCoefficient}`,
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
          {copiedFrom ? (
            <p
              role={assessment.needs_review ? "status" : undefined}
              className={
                assessment.needs_review
                  ? "border-status-todo bg-muted mt-2 rounded-xl border p-3 text-sm"
                  : "text-muted-foreground mt-1 text-sm"
              }
            >
              {assessment.needs_review ? <strong>Reprise : à relire. </strong> : null}
              Copiée de{" "}
              <Link
                href={`/modules/${copiedFrom.module_id}/assessments/${copiedFrom.id}`}
                className="underline underline-offset-2"
              >
                {copiedFrom.title}
              </Link>
              {(copiedFrom.module as unknown as { name: string } | null)?.name
                ? ` (${(copiedFrom.module as unknown as { name: string }).name})`
                : ""}
              .
              {assessment.needs_review ? (
                <>
                  {" "}
                  Le sujet et « Ce qui est évalué » parlent peut-être encore de l’autre module : ils
                  partiraient tels quels dans la progression.{" "}
                  <Link
                    href={`/modules/${assessment.module_id}/assessments/${assessment.id}/edit`}
                    className="font-semibold underline underline-offset-2"
                  >
                    Relire et enregistrer
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
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
          {/* Infos en texte gris séparé par « · » (pas des pastilles : ce ne sont pas des statuts). */}
          <p className="text-muted-foreground mt-1 text-sm">
            {isUngradedReview(assessment)
              ? "Point d’étape · sans note · hors moyenne"
              : `Coefficient ${ruleCoefficient} · sur ${assessment.maxScore} · ${
                  assessment.is_group_grade ? "note de groupe" : "note individuelle"
                }`}
            {grid ? (
              <>
                {" · grille "}
                <a href="#gr" className="text-primary underline underline-offset-2">
                  {grid.name}
                </a>
              </>
            ) : null}
          </p>
          {/* Même repère sur toutes les évaluations (oral compris) : l'état du sujet et « Prêt pour
              le jour J ? », même quand la préparation est repliée sous les copies. */}
          {!assessment.makeup_of_id && blocks.dayJ && copiesFirst ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sujet :</span>
              <SubjectStatusBadge
                moduleId={id}
                assessmentId={assessmentId}
                title={assessment.title}
                status={assessment.prep_status}
              />
              <a href="#dayj-top" className="inline-flex min-h-11 items-center gap-1.5">
                <span className="text-muted-foreground">Prêt pour le jour J ?</span>
                <Status state={dayJTop.allReady ? "ready" : "todo"}>
                  {dayJTop.allReady ? "Prête" : `${dayJTop.missing.length} à compléter`}
                </Status>
              </a>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {blocks.quiz && !assessment.is_group_grade && !isUngradedReview(assessment) ? (
            <Button asChild variant="secondary">
              <Link href={`/modules/${id}/assessments/${assessmentId}/quiz`}>
                <ListChecks aria-hidden />
                QCM en ligne
              </Link>
            </Button>
          ) : null}
          {readyToSend ? (
            <Button asChild>
              <Link href={`/modules/${id}/assessments/${assessmentId}/results`}>
                Envoyer les résultats
              </Link>
            </Button>
          ) : null}
          {isOral ? (
            <Button asChild variant={readyToSend ? "secondary" : "default"}>
              <Link href={`/modules/${id}/assessments/${assessmentId}/oral`}>
                <Mic aria-hidden />
                Faire passer l’oral
              </Link>
            </Button>
          ) : null}
          {quizReview ? (
            <Button asChild variant={readyToSend ? "secondary" : "default"}>
              <Link href={`/modules/${id}/assessments/${assessmentId}/quiz/links#follow`}>
                <ClipboardCheck aria-hidden />
                Relire les copies
              </Link>
            </Button>
          ) : null}
          {(assessment.grading_grid || quiz) && !oralCovers && !quizReview ? (
            <Button asChild variant={isOral || readyToSend ? "secondary" : "default"}>
              <Link href={`/modules/${id}/assessments/${assessmentId}/correct`}>
                <ClipboardCheck aria-hidden />
                {isUngradedReview(assessment)
                  ? "Commenter"
                  : readyToSend
                    ? "Relire les copies"
                    : overview.done + overview.inProgress > 0
                      ? "Continuer la correction"
                      : "Corriger"}
              </Link>
            </Button>
          ) : null}
          {isProgressReview(assessment) && !isUngradedReview(assessment) ? (
            <Button asChild variant="secondary">
              <Link href={`/modules/${id}/assessments/${assessmentId}/correct?vue=etape`}>
                Repères et retours
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="secondary">
            <Link href={`/modules/${id}/assessments/${assessmentId}/edit`}>
              <Pencil aria-hidden />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      {/* Date passée : « Avant le jour J » n'est plus l'action du moment, il va dans la Préparation. */}
      {!assessment.makeup_of_id && blocks.dayJ && !copiesFirst ? (
        <section aria-label="Avant le jour J" className={`${card} space-y-2`}>
          <div className="flex flex-wrap items-center gap-2">
            <SubjectStatusBadge
              moduleId={id}
              assessmentId={assessmentId}
              title={assessment.title}
              status={assessment.prep_status}
            />
          </div>
          <DayJBlock dayJ={dayJTop} titleId="dayj-top" />
        </section>
      ) : null}

      {/* Sommaire : chaque bloc à un clic, sans défiler. */}
      <nav
        aria-label="Sommaire de l’évaluation"
        className="flex flex-wrap items-center gap-x-4 text-sm leading-none"
      >
        {targets.length > 0 ? (
          <a
            href="#copies"
            className="text-primary font-semibold underline-offset-2 hover:underline"
          >
            Copies
          </a>
        ) : null}
        {blocks.subject ? (
          <a
            href="#subject"
            className="text-primary inline-flex min-h-11 items-center underline-offset-2 hover:underline"
          >
            Sujet
          </a>
        ) : null}
        {blocks.grid ? (
          <a
            href="#gr"
            className="text-primary inline-flex min-h-11 items-center underline-offset-2 hover:underline"
          >
            Grille
          </a>
        ) : null}
        {blocks.expectations ? (
          <a
            href="#at"
            className="text-primary inline-flex min-h-11 items-center underline-offset-2 hover:underline"
          >
            Attendus
          </a>
        ) : null}
      </nav>

      {/* Le jour de l'oral : horaires et ordre de passage restent visibles, hors de la préparation. */}
      {copiesFirst ? oralTiming : null}
      {copiesFirst ? copiesSection : null}

      <RepublishNotice
        moduleId={id}
        assessmentId={assessmentId}
        names={await changedSincePublication()}
      />

      <IncompletePublishedWarning
        moduleId={id}
        assessmentId={assessmentId}
        copies={publishedIncomplete(
          incompleteCopies(grades, assessment.groups),
          new Set((await listResultLinks(assessmentId)).byStudent.keys()),
        )}
      />

      <div className="space-y-4">
        {(submissionData.unseen?.length ?? 0) > 0 ? (
          <p
            role="status"
            className="bg-primary/10 border-primary/50 rounded-xl border p-4 text-sm"
          >
            <strong>
              {new Set(submissionData.unseen?.map((u) => u.group_id ?? u.student_id)).size} nouveau
              {new Set(submissionData.unseen?.map((u) => u.group_id ?? u.student_id)).size > 1
                ? "x rendus"
                : " rendu"}
            </strong>{" "}
            pour {assessment.title}. Il disparaît une fois vu.
          </p>
        ) : null}
        <MarkDepositsSeen
          assessmentId={assessmentId}
          active={(submissionData.unseen?.length ?? 0) > 0}
        />

        {hasGrades && noSpace.length > 0 ? (
          <p role="status" className="bg-muted rounded-xl border p-4 text-sm">
            <strong>
              {noSpace.length} étudiant·e{noSpace.length > 1 ? "s" : ""} sans espace actif
            </strong>{" "}
            ({noSpace.slice(0, 4).join(", ")}
            {noSpace.length > 4 ? "…" : ""}) : leur note n’apparaîtra pas dans un espace.{" "}
            <Link
              href={`/modules/${id}/frise`}
              className="font-semibold underline underline-offset-2"
            >
              Créer leurs liens d’espace
            </Link>
          </p>
        ) : null}
      </div>

      <details id="preparation" open={!copiesFirst} className="group/prep space-y-4">
        <summary className="hover:bg-muted font-heading flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-lg font-bold">
          Préparation
          <span className="text-muted-foreground font-sans text-sm font-normal">
            {[
              blocks.examKind && !assessment.is_group_grade ? "épreuve" : null,
              blocks.grid ? (grid ? "grille" : "pas de grille") : null,
              blocks.dayJ ? "cadre" : null,
              blocks.subject ? "sujet" : null,
              blocks.expectations ? "attendus" : null,
              blocks.submissions ? "rendus" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </summary>
        <div className="space-y-4 pt-2">
          {!assessment.makeup_of_id && blocks.dayJ && copiesFirst ? (
            <section aria-label="Avant le jour J" className={`${card} space-y-2`}>
              {/* L'état du sujet est dans l'en-tête (un seul « Prête · Remettre À construire »). */}
              <DayJBlock dayJ={dayJTop} titleId="dayj-top" />
            </section>
          ) : null}
          <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
            <div className="w-full min-w-0 flex-1 space-y-4 lg:basis-0">
              {!assessment.is_group_grade && blocks.examKind ? (
                <section aria-labelledby="ty" className={`${card} space-y-3`}>
                  <h2 id="ty" className="text-sm font-semibold">
                    Quelle épreuve ?
                  </h2>
                  <ExamKindForm
                    moduleId={id}
                    assessmentId={assessmentId}
                    available={"exam_kind" in assessment}
                    quizHref={`/modules/${id}/assessments/${assessmentId}/quiz`}
                    typeLabel={assessment.type ?? ""}
                    editHref={`/modules/${id}/assessments/${assessmentId}/edit`}
                    initial={{
                      kind: examKindOf(assessment),
                      versions: parseSubjectVersions(assessment.subject_versions),
                      makeupPrepared: !!assessment.makeup_prepared,
                    }}
                  />
                </section>
              ) : null}
              {kindNow === "school_grade" ? (
                <section aria-labelledby="ng" className={`${card} space-y-2`}>
                  <h2 id="ng" className="text-sm font-semibold">
                    Note de l’école
                  </h2>
                  <p className="text-sm">
                    Coefficient imposé par l’école : <strong>×{ruleCoefficient}</strong>. Note sur{" "}
                    {formatNumber(assessment.maxScore)}, saisie directement plus bas, sans sujet ni
                    grille.
                  </p>
                  <Link
                    href={`/modules/${id}/assessments/${assessmentId}/edit`}
                    className="text-primary text-sm font-semibold underline-offset-2 hover:underline"
                  >
                    Changer le coefficient
                  </Link>
                </section>
              ) : null}
              <section
                aria-labelledby="gr"
                hidden={!blocks.grid}
                className={`${card} w-full min-w-0 flex-1 space-y-4 lg:basis-0`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id="gr" className="text-sm font-semibold">
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
                      {canPresent(assessment.prep_status) ? (
                        <DownloadButton
                          href={`/api/modules/${id}/assessments/${assessmentId}/grid`}
                          icon={<FileDown aria-hidden />}
                          doneLabel="Grille téléchargée."
                        >
                          Grille pour les étudiant·es (PDF)
                        </DownloadButton>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled
                            aria-describedby="pdf-hint"
                          >
                            <FileDown aria-hidden />
                            Grille pour les étudiant·es (PDF)
                          </Button>
                          <p id="pdf-hint" className="text-muted-foreground self-center text-sm">
                            Passe le sujet en « Prête » pour la remettre aux étudiant·es.
                          </p>
                        </>
                      )}
                    </div>
                    <details>
                      <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer items-center rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
                        Voir la grille détaillée (critères et paliers)
                      </summary>
                      <div className="space-y-2 pt-2">
                        {gridGroups.map((g, gi) => (
                          <div key={g.axis?.id ?? `loose-${gi}`} className="space-y-2">
                            {g.axis ? (
                              <div className="flex items-center justify-between gap-3 pt-1">
                                <strong>Axe · {g.axis.label}</strong>
                                <span className="text-muted-foreground text-sm">
                                  {formatNumber(
                                    g.criteria
                                      .filter((c) => !c.is_bonus)
                                      .reduce((n, c) => n + c.weight, 0),
                                  )}{" "}
                                  points
                                </span>
                              </div>
                            ) : null}
                            {g.criteria.map((c) => (
                              <div key={c.id} className="rounded-xl border p-3">
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
                                      <li
                                        key={l.id}
                                        className="bg-muted/40 rounded-xl p-2.5 text-sm"
                                      >
                                        <strong>
                                          {formatNumber(l.points)} pt{l.points >= 2 ? "s" : ""}
                                        </strong>
                                        <span className="text-muted-foreground block text-[0.8125rem]">
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
                      </div>
                    </details>
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
                    <p className="text-muted-foreground text-sm">
                      {gridModules > 1
                        ? `Utilisée dans ${gridModules} modules : si tu la modifies, elle change pour tous.`
                        : "Cette grille ne sert que dans ce module."}
                    </p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                      Pas de grille pour l’instant : la note se saisit directement, sur{" "}
                      {formatNumber(assessment.maxScore)}. Une grille donne des critères et des
                      paliers à la correction, et se remet aux étudiant·es avant le travail.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild>
                        <Link href="/assessments/grids/new">Créer la grille</Link>
                      </Button>
                      <Button asChild variant="ghost">
                        <Link href={`/modules/${id}/assessments/${assessmentId}/edit`}>
                          Reprendre une grille existante
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              <section aria-labelledby="ce" className={card} hidden={!blocks.dayJ}>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <h2 id="ce" className="text-sm font-semibold">
                    Le cadre pour les étudiant·es
                  </h2>
                  <Pill tone={toneOf[frame.tone]} className="whitespace-normal">
                    {frame.label}
                  </Pill>
                </div>
                {assessment.is_group_grade ? (
                  <ul className="mb-2 flex flex-wrap gap-1.5">
                    {frameChecks.map(([label, ok]) => (
                      <li key={label}>
                        <Pill tone={ok ? "ok" : "warn"}>
                          {label}
                          <span className="sr-only"> : {ok ? "renseigné" : "à renseigner"}</span>
                        </Pill>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-1 text-sm">
                      Écrit au vouvoiement. Projeté en début d’épreuve.
                    </p>
                    <ul className="divide-y">
                      {individualFrame({
                        kind: examKindOf(assessment),
                        // submit_mode fait foi (submission_mode n'est plus lu, lot 6 du schéma).
                        mode: submitModeOf(assessment) === "app" ? "app" : "manual",
                        courseNumber: course ? courseNumber : null,
                        date: assessment.date,
                        deliverable: assessment.deliverable_md,
                        evaluated: assessment.evaluated_md,
                        maxScore: assessment.maxScore,
                        coefficient: ruleCoefficient,
                        whereToSubmit: assessment.where_to_submit,
                        hasGrid: !!grid,
                      }).map((line) => (
                        <li
                          key={line.label}
                          className="flex flex-wrap items-start gap-3 py-2.5 text-sm"
                        >
                          <strong className="w-40 flex-none">{line.label}</strong>
                          {/* Résumé sur 2 lignes, sans syntaxe Markdown : le texte complet est dans « Sujet ». */}
                          <span className="line-clamp-2 min-w-0 flex-1">
                            {line.text
                              ? line.text
                                  .replace(/[#>*_`]+/g, "")
                                  .replace(/^\s*[-•]\s+/gm, "")
                                  .replace(/\s+/g, " ")
                                  .trim()
                              : "À renseigner."}
                          </span>
                          <Pill tone={line.filled ? "ok" : "warn"}>
                            {line.filled ? "Prérempli" : "À renseigner"}
                          </Pill>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {canPresent(assessment.prep_status) ? (
                    <OpenInWindowButton href={`/present/modules/${id}/assessments/${assessmentId}`}>
                      Présenter le sujet
                    </OpenInWindowButton>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled
                      aria-describedby="not-ready-hint"
                    >
                      <Presentation aria-hidden />
                      Présenter le sujet
                    </Button>
                  )}
                </div>
                {canPresent(assessment.prep_status) ? null : (
                  <p id="not-ready-hint" className="text-muted-foreground mt-2 text-sm">
                    Passe le sujet en « Prête » pour le présenter.
                  </p>
                )}
                {course ? (
                  <p className="text-muted-foreground mt-2 text-sm">
                    Séance {courseNumber} — {course.title}
                  </p>
                ) : null}

                <WhereToSubmit
                  moduleId={id}
                  assessmentId={assessmentId}
                  initial={assessment.where_to_submit ?? ""}
                />
                <SubmitSettings
                  moduleId={id}
                  assessmentId={assessmentId}
                  mode={
                    (assessment as unknown as { submit_mode?: string }).submit_mode === "app"
                      ? "app"
                      : "elsewhere"
                  }
                  accepts={(() => {
                    const v = (assessment as unknown as { submit_accepts?: string }).submit_accepts;
                    return v === "file" || v === "link" ? v : "both";
                  })()}
                  hasDeadline={!!assessment.date || !!course?.session_date}
                />
              </section>
            </div>
            <aside
              aria-label="Préparation de l’évaluation"
              className="w-full min-w-0 space-y-4 lg:w-[26rem] lg:flex-none"
            >
              {oralTiming}
              {blocks.expectations ? evaluatedSection : null}
              {assessment.is_group_grade ? (
                <section aria-labelledby="ae" className={card}>
                  <h2 id="ae" className="mb-1.5 text-sm font-semibold">
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
              ) : blocks.makeupAndBonus ? (
                <section aria-labelledby="bonus" className={card}>
                  <h2 id="bonus" className="mb-1.5 text-sm font-semibold">
                    Note bonus
                  </h2>
                  <BonusSettings
                    moduleId={id}
                    assessmentId={assessmentId}
                    isBonus={!!assessment.is_bonus}
                    scale={assessment.is_bonus ? parseScale(assessment.score_scale) : null}
                  />
                </section>
              ) : null}
            </aside>
          </div>

          <section
            aria-labelledby="subject"
            className={`${card} space-y-4`}
            hidden={!blocks.subject}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="subject" className="text-sm font-semibold">
                Sujet
              </h2>
            </div>

            {subjectParts.length === 0 && files.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucun sujet rédigé : ouvre « Modifier » pour ajouter l’objectif, la consigne et le
                rendu attendu.
              </p>
            ) : null}

            {subjectParts.map((part) => (
              <div key={part.key}>
                <h3 className="mb-1 text-sm font-semibold">{part.heading}</h3>
                {part.markdown ? <Markdown source={part.text} /> : <p>{part.text}</p>}
              </div>
            ))}

            {files.length > 0 ? (
              <div>
                <h3 className="mb-1 text-sm font-semibold">Fichiers joints</h3>
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

          {submissionData.available &&
          targets.length > 0 &&
          blocks.submissions &&
          examKindOf(assessment) !== "qcm" ? (
            <section aria-labelledby="rendus" className="space-y-3">
              <h2 id="rendus" className="text-sm font-semibold">
                Rendus déposés
              </h2>
              <p className="text-muted-foreground text-sm">
                Les dépôts des étudiant·es arrivent ici ; tu peux aussi ajouter à la main des
                fichiers ou liens par {assessment.is_group_grade ? "groupe" : "étudiant·e"} («
                ajouté par toi »). Ils s’ouvrent aussi depuis la copie à corriger.
              </p>
              <SubmissionItems
                moduleId={id}
                assessmentId={assessmentId}
                deadline={
                  deadlineOf(
                    assessment.date ?? course?.session_date ?? null,
                    (
                      assessment as unknown as { oral_start_time?: string | null }
                    ).oral_start_time?.slice(0, 5) ?? null,
                  )?.toISOString() ?? null
                }
                rows={(() => {
                  const nameOf = new Map([
                    ...targets.flatMap(({ students }) =>
                      students.map((st) => [st.id, `${st.first_name} ${st.last_name}`] as const),
                    ),
                    ...assessment.groups.flatMap((g) =>
                      g.members.map((m) => [m.id, `${m.first_name} ${m.last_name}`] as const),
                    ),
                  ]);
                  const withMeta = <T extends object>(it: T) => {
                    const x = it as unknown as {
                      submitted_at?: string | null;
                      submitted_by_student_id?: string | null;
                    };
                    return {
                      ...it,
                      submitted_at: x.submitted_at ?? null,
                      submitted_by_name: x.submitted_by_student_id
                        ? (nameOf.get(x.submitted_by_student_id) ?? null)
                        : null,
                    };
                  };
                  // Anciennes versions par personne ou groupe, regroupées par envoi (la plus récente d'abord).
                  const historyOf = new Map<
                    string,
                    Map<string, ReturnType<typeof withMeta<(typeof replacedRows)[number]>>[]>
                  >();
                  const replacedRows = submissionData.replaced ?? [];
                  for (const r of replacedRows) {
                    const key = r.group_id ?? r.student_id;
                    const batch = (r as unknown as { batch_id?: string | null }).batch_id ?? r.id;
                    if (!key) continue;
                    const byBatch = historyOf.get(key) ?? new Map();
                    byBatch.set(batch, [...(byBatch.get(batch) ?? []), withMeta(r)]);
                    historyOf.set(key, byBatch);
                  }
                  const historyFor = (key: string) =>
                    [...(historyOf.get(key)?.entries() ?? [])]
                      .map(([batch, items]) => ({
                        key: batch,
                        at: items[0]?.submitted_at ?? items[0]?.created_at ?? null,
                        by: items[0]?.submitted_by_name ?? null,
                        items,
                      }))
                      .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
                  const versionsOf = new Map<string, Set<string>>();
                  for (const r of submissionData.replaced ?? []) {
                    const key = r.group_id ?? r.student_id;
                    const batch = (r as unknown as { batch_id?: string | null }).batch_id;
                    if (key && batch)
                      versionsOf.set(key, (versionsOf.get(key) ?? new Set()).add(batch));
                  }
                  const byOwner = groupByOwner(
                    submissionData.items.map((it) => {
                      const x = it as unknown as {
                        submitted_at?: string | null;
                        submitted_by_student_id?: string | null;
                      };
                      return {
                        ...it,
                        submitted_at: x.submitted_at ?? null,
                        submitted_by_name: x.submitted_by_student_id
                          ? (nameOf.get(x.submitted_by_student_id) ?? null)
                          : null,
                      };
                    }),
                  );
                  return assessment.is_group_grade
                    ? targets.map(({ group }) => ({
                        owner: { kind: "group" as const, id: group.id },
                        name: group.name,
                        items: byOwner.get(group.id) ?? [],
                        versions: (versionsOf.get(group.id)?.size ?? 0) + 1,
                        history: historyFor(group.id),
                      }))
                    : targets.flatMap(({ students }) =>
                        students.map((s) => ({
                          owner: { kind: "student" as const, id: s.id },
                          name: `${s.first_name} ${s.last_name}`,
                          items: byOwner.get(s.id) ?? [],
                          versions: (versionsOf.get(s.id)?.size ?? 0) + 1,
                          history: historyFor(s.id),
                        })),
                      );
                })()}
              />
            </section>
          ) : null}
        </div>
      </details>

      {makeupPanel}

      {copiesFirst ? null : copiesSection}

      <div className="border-t pt-4">
        <DeleteAssessmentButton moduleId={id} assessmentId={assessmentId} />
      </div>
    </div>
  );
}
