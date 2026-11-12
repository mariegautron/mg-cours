import { moduleStudentAverages } from "@/lib/assessments/queries";
import { assessmentKindOf, kindBlocks } from "@/lib/assessments/kind";
import { bonusLine, parseScale } from "@/lib/assessments/score-scale";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { QcmAnswersPanel } from "@/components/assessments/qcm-answers-panel";
import type { DrawnQuestion } from "@/lib/quiz/types";
import { readAnswer } from "@/lib/quiz/grading";
import { createClient } from "@/lib/supabase/server";
import { makeupHrefs } from "@/lib/assessments/makeup-queries";
import { RenduReview, type RenduCopy } from "@/components/assessments/rendu-review";
import { isProgressReview, isUngradedReview } from "@/lib/assessments/progress-review";
import { ProgressReviewPage } from "@/components/assessments/progress-review-page";
import { buildSpaceInits } from "@/lib/assessments/space-init";
import { examKindOf } from "@/lib/assessments/exam-kind";
import { isOralAssessment } from "@/lib/assessments/oral";
import { oralCoversAllGroups } from "@/lib/assessments/oral-slots";
import { gradingTargets } from "@/lib/assessments/targets";
import { deadlineOf } from "@/lib/deposits/rules";
import { OpenReview, type ReviewCopy } from "@/components/assessments/open-review";
import { loadOpenReviewContext, obj, readEntries } from "@/lib/assessments/open-review-server";
import { GradingSession } from "@/components/assessments/grading-session";
import {
  buildSessionSections,
  toObservationLines,
} from "@/app/(app)/modules/[id]/assessments/grading-sections";
import {
  getAssessment,
  getGradesByAssessment,
  listComments,
  listGroupGradeMembers,
} from "@/lib/assessments/queries";
import { getQuizByAssessment } from "@/lib/quiz/queries";
import { getModule } from "@/lib/modules/queries";
import { listModuleObservations } from "@/lib/notebook/queries";
import { groupByOwner } from "@/lib/projects/submission-items";
import { listSubmissionItems } from "@/lib/projects/submission-queries";
import { themeTitleByGroup } from "@/lib/projects/queries";
import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";

export const metadata: Metadata = { title: "Corriger" };

/**
 * Correction plein écran d'une évaluation : une copie à la fois (ou tous les critères d'un coup),
 * navigation d'une copie à l'autre, enregistrement automatique. `?copy=` ouvre une copie précise.
 */
export default async function CorrectPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/correct">) {
  const { id, assessmentId } = await params;
  const { copy } = await searchParams;
  const [assessment, grades, comments, mod, moduleObservations, absenceRule] = await Promise.all([
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
    listComments(),
    getModule(id),
    listModuleObservations(id),
    getAbsenceRuleForModule(id),
  ]);
  if (!assessment || assessment.module_id !== id) notFound();

  // Point d'étape : un rendu commenté sans note (repères par critère), jamais de note.
  // Point d'étape noté : correction normale ; ses repères et retours sur `?vue=etape`.
  const { vue } = await searchParams;
  if (isUngradedReview(assessment) || (isProgressReview(assessment) && vue === "etape")) {
    return (
      <ProgressReviewPage
        moduleId={id}
        assessment={assessment}
        initialId={typeof copy === "string" ? copy : undefined}
      />
    );
  }

  // Oral : « Faire passer l'oral » sert aussi à corriger après coup (un seul chemin), dès que
  // chaque groupe a son créneau. La vue « par critère » (`?vue=critere`) reste ici.
  if (
    isOralAssessment(assessment) &&
    vue !== "critere" &&
    (assessment.grading_grid?.criteria ?? []).length > 0 &&
    (await oralCoversAllGroups(
      assessmentId,
      assessment.groups.map((g) => g.id),
    ))
  )
    redirect(`/modules/${id}/assessments/${assessmentId}/oral`);

  const [overrideRows, themes, submissionData] = await Promise.all([
    listGroupGradeMembers(grades.filter((g) => g.student_group_id).map((g) => g.id)),
    themeTitleByGroup(assessment.project_id),
    listSubmissionItems(assessmentId),
  ]);
  const sections = buildSessionSections({
    moduleId: id,
    assessment,
    grades,
    overrideRows,
    observations: toObservationLines(moduleObservations),
    themes,
    // Bande « Rendu » seulement quand un rendu est attendu (type de l'évaluation, lot 5).
    submissions:
      submissionData.available && kindBlocks(assessmentKindOf(assessment)).submissions
        ? groupByOwner(submissionData.items)
        : undefined,
  });
  // Copie excusée : « Voir son rattrapage » quand il est déjà préparé.
  const makeupLinks = await makeupHrefs(id, assessmentId);
  for (const item of sections.flatMap((sec) => sec.items))
    (item as { makeupHref?: string | null }).makeupHref = makeupLinks.get(item.id) ?? null;
  // Note bonus : l'effet réel (enregistré) sur la moyenne de chaque personne, à côté du score.
  if (assessment.is_bonus) {
    const effectOf = new Map(
      (await moduleStudentAverages(id)).map((a) => [a.student.id, a.bonusEffect]),
    );
    for (const item of sections.flatMap((s) => s.items)) {
      item.bonusLine = bonusLine(effectOf.get(item.id) ?? null);
    }
  }
  const back = `/modules/${id}/assessments/${assessmentId}`;
  const quiz = assessment.is_group_grade ? null : await getQuizByAssessment(assessmentId);

  // Rendu (fichiers ou liens) corrigé à la grille : le rendu à gauche, la grille en lettres à droite.
  // Oral : la même grille en lettres A à D (A = le plus haut), sans bloc « Rendu » (lot 0, point C).
  const examKind = examKindOf(assessment);
  if (
    !quiz &&
    (examKind === "files" || examKind === "oral") &&
    (assessment.grading_grid?.criteria ?? []).length
  ) {
    const rawGrades = await getGradesByAssessment(assessmentId, { skipRewrite: true });
    const targets = gradingTargets(assessment.is_group_grade, assessment.groups);
    const subjects = assessment.is_group_grade
      ? targets.map(({ group }) => ({
          id: group.id,
          name: group.name,
          isGroup: true,
          members: group.members.map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })),
        }))
      : targets.flatMap(({ students }) =>
          students.map((st) => ({
            id: st.id,
            name: `${st.first_name} ${st.last_name}`,
            isGroup: false,
            members: [{ id: st.id, name: `${st.first_name} ${st.last_name}` }],
          })),
        );
    const { oralCriteria, spaces, schoolRule } = await buildSpaceInits({
      id,
      assessmentId,
      assessment,
      grades: rawGrades,
      overrideRows,
      subjects,
    });
    if (oralCriteria.length > 0 && Object.keys(spaces).length > 0) {
      // Date et auteur·e de chaque dépôt (colonnes ajoutées par la migration du dépôt).
      const nameOf = new Map(
        assessment.groups.flatMap((g) =>
          g.members.map((m) => [m.id, `${m.first_name} ${m.last_name}`] as const),
        ),
      );
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
      // Anciennes versions (dépôts remplacés), regroupées par envoi.
      const historyOf = (ownerId: string) => {
        const byBatch = new Map<string, typeof submissionData.items>();
        for (const r of submissionData.replaced ?? []) {
          if ((r.group_id ?? r.student_id) !== ownerId) continue;
          const batch = (r as unknown as { batch_id?: string | null }).batch_id ?? r.id;
          byBatch.set(batch, [...(byBatch.get(batch) ?? []), r]);
        }
        return [...byBatch.entries()]
          .map(([key, list]) => {
            const x = list[0] as unknown as {
              submitted_at?: string | null;
              submitted_by_student_id?: string | null;
            };
            return {
              key,
              at: x.submitted_at ?? list[0].created_at,
              by: x.submitted_by_student_id
                ? (nameOf.get(x.submitted_by_student_id) ?? null)
                : null,
              items: list,
            };
          })
          .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
      };
      const copies: RenduCopy[] = subjects.flatMap((sub) =>
        spaces[sub.id]
          ? [
              {
                id: sub.id,
                name: sub.name,
                isGroup: sub.isGroup,
                members: spaces[sub.id].members,
                init: spaces[sub.id].init,
                items: byOwner.get(sub.id) ?? [],
                history: historyOf(sub.id),
              },
            ]
          : [],
      );
      return (
        <div className="mx-auto max-w-[96rem] space-y-3">
          <Link href={back} className="text-sm underline underline-offset-2">
            ← {assessment.title}
          </Link>
          <RenduReview
            moduleId={id}
            assessmentId={assessmentId}
            title={assessment.title}
            copies={copies}
            criteria={oralCriteria}
            autoValidatedIds={assessment.auto_validated_criterion_ids}
            maxScore={assessment.max_score}
            schoolRule={schoolRule ?? "keep_group_grade"}
            deadline={deadlineOf(assessment.date, null)?.toISOString() ?? null}
            initialId={typeof copy === "string" ? copy : undefined}
            initialView={vue === "critere" ? "criterion" : undefined}
            withRendu={examKind !== "oral"}
          />
        </div>
      );
    }
  }

  // Questions ouvertes tirées au sort : l'écran de relecture remplace la correction par copie.
  if (quiz?.correction_mode === "open_questions") {
    const ctx = await loadOpenReviewContext(await createClient(), assessmentId);
    if (ctx) {
      const copies: ReviewCopy[] = ctx.attempts.map((a) => {
        const entries = readEntries(a.review?.questions);
        const versions = Object.fromEntries(
          Object.entries(obj(a.review?.field_versions)).filter(
            (e): e is [string, number] => typeof e[1] === "number",
          ),
        );
        return {
          id: a.id,
          name: a.name,
          studentId: a.studentId,
          attendance: grades.find((g) => g.student_id === a.studentId)?.attendance ?? null,
          submitted: a.status === "submitted",
          locked: a.review ? a.review.locked : a.legacyDone,
          legacy: a.legacyDone,
          writtenAt: a.review?.written_at ?? null,
          drawn: a.drawn.map((q, i) => ({
            position: i + 1,
            questionId: q.question_id,
            statement: q.statement,
            points: q.points,
            expected: q.general_feedback,
          })),
          // Réponse lisible quel que soit le type : texte libre, nombre, ou choix cochés.
          answers: Object.fromEntries(
            a.drawn.map((q, i) => {
              const raw =
                a.answers[String(i + 1)] ?? a.answers[q.question_id] ?? a.answers[String(i)];
              const ans = readAnswer(raw, q);
              const text = !ans
                ? ""
                : "text" in ans
                  ? ans.text
                  : "number" in ans
                    ? ans.number
                    : ans.choices.length
                      ? ans.choices
                          .map((c) => `☑ ${q.choices[c]?.text ?? `choix ${c + 1}`}`)
                          .join("\n")
                      : "";
              return [String(i + 1), text];
            }),
          ),
          // Copie corrigée par l'ancienne page : points repris, en lecture.
          entries:
            a.review || !a.legacyDone
              ? entries
              : Object.fromEntries(
                  Object.entries(a.manual)
                    .filter((e): e is [string, number] => typeof e[1] === "number")
                    .map(([pos, points]) => [
                      pos,
                      {
                        letter: "",
                        points,
                        comment: "",
                        validated_at: "legacy",
                        validated: { letter: "", points, comment: "" },
                      },
                    ]),
                ),
          globalComment: a.review?.global_comment ?? "",
          criterionLetters: Object.fromEntries(
            Object.entries(obj(a.review?.criterion_letters)).filter(
              (e): e is [string, string] => typeof e[1] === "string",
            ),
          ),
          versions,
        };
      });
      // Personnes visées sans copie (pas de lien préparé, rien rendu) : une ligne grise, jamais notée.
      const withAttempt = new Set(ctx.attempts.map((a) => a.studentId));
      const missing = new Map<string, string>();
      for (const g of assessment.groups)
        for (const m of g.members)
          if (!withAttempt.has(m.id)) missing.set(m.id, `${m.first_name} ${m.last_name}`);
      for (const [sid, name] of missing)
        copies.push({
          id: `none-${sid}`,
          name,
          studentId: sid,
          attendance: grades.find((g) => g.student_id === sid)?.attendance ?? null,
          submitted: false,
          locked: false,
          legacy: false,
          writtenAt: null,
          drawn: [],
          answers: {},
          entries: {},
          globalComment: "",
          criterionLetters: {},
          versions: {},
        });
      copies.sort((x, y) => x.name.localeCompare(y.name, "fr"));
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h1 className="text-xl font-semibold">Relire : {assessment.title}</h1>
            <p className="text-muted-foreground text-sm">
              Questions ouvertes tirées au sort. Tout s’enregistre au fur et à mesure.{" "}
              <Link href={back} className="underline underline-offset-2">
                Vue d’ensemble
              </Link>
            </p>
          </div>
          <OpenReview
            moduleId={id}
            assessmentId={assessmentId}
            maxScore={ctx.maxScore ?? 20}
            criteria={ctx.criteria}
            initialLinks={ctx.links}
            copies={copies}
          />
        </div>
      );
    }
  }
  if (quiz) {
    // Réponses du QCM affichées dans la copie, en lecture seule (la relecture reste dans le suivi).
    const supabase = await createClient();
    const { data: attempts } = await supabase
      .from("quiz_attempt")
      .select("id, student_id, drawn, answers, manual_scores")
      .eq("quiz_id", quiz.id)
      .eq("status", "submitted");
    const byStudent = new Map((attempts ?? []).map((a) => [a.student_id, a]));
    for (const item of sections.flatMap((s) => s.items)) {
      const a = byStudent.get(item.id);
      if (!a) continue;
      item.qcm = (
        <QcmAnswersPanel
          name={item.title}
          drawn={a.drawn as unknown as DrawnQuestion[]}
          answers={(a.answers ?? {}) as Record<string, unknown>}
          manual={(a.manual_scores ?? {}) as Record<string, unknown>}
          reviewHref={`${back}/quiz/attempts/${a.id}`}
        />
      );
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold">Corriger : {assessment.title}</h1>
        <p className="text-muted-foreground text-sm">
          Tout s’enregistre au fur et à mesure.{" "}
          {assessment.is_group_grade ? "Note de groupe." : "Note individuelle."} Sur{" "}
          {assessment.maxScore}.
        </p>
      </div>
      {quiz ? (
        <p className="bg-muted/50 rounded-2xl border p-3 text-sm">
          Cette évaluation a un QCM en ligne : les réponses de chaque étudiant·e se relisent,
          question par question, dans le suivi du QCM.{" "}
          <Link
            href={`${back}/quiz/links#follow`}
            className="font-semibold underline underline-offset-2"
          >
            Relire les copies du QCM
          </Link>
        </p>
      ) : null}
      {sections.flatMap((s) => s.items).length === 0 ? (
        <p className="text-muted-foreground">Aucun groupe visé : modifie l’évaluation.</p>
      ) : (
        <GradingSession
          sections={sections}
          grid={assessment.grading_grid}
          maxScore={assessment.maxScore}
          comments={comments}
          autoValidatedIds={assessment.auto_validated_criterion_ids}
          subject={mod?.name ?? null}
          absenceRule={absenceRule}
          bonusScale={assessment.is_bonus ? parseScale(assessment.score_scale) : null}
          initialId={typeof copy === "string" ? copy : undefined}
          initialView={vue === "critere" ? "criterion" : undefined}
          overviewHref={back}
        />
      )}
    </div>
  );
}
