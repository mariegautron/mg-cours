import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionError } from "@/components/action-error";
import {
  closeQuiz,
  createQuiz,
  publishQuiz,
  unpublishQuiz,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { AttemptActions } from "@/components/quiz/attempt-actions";
import { PrepareLinks } from "@/components/quiz/links-panel";
import { QuizConfigForm } from "@/components/quiz/quiz-config-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAssessment } from "@/lib/assessments/queries";
import { gradingTargets } from "@/lib/assessments/targets";
import { getQuizByAssessment, listAttempts, loadBank, passingStudents } from "@/lib/quiz/queries";
import { attemptScoreLabel, attemptStatusLabel } from "@/lib/quiz/status";
import { familyClosedReason } from "@/lib/quiz/visibility";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "QCM" };

const STATUS_LABEL = { draft: "Brouillon", published: "Publié", closed: "Clôturé" } as const;

export default async function QuizPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/quiz">) {
  const { id, assessmentId } = await params;
  const { error } = await searchParams;
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== id) notFound();
  const quiz = await getQuizByAssessment(assessmentId);
  const back = `/modules/${id}/assessments/${assessmentId}`;

  const heading = (
    <div className="space-y-1">
      <nav aria-label="Fil d’Ariane" className="text-muted-foreground text-sm">
        <Link href={back} className="underline-offset-2 hover:underline">
          {assessment.title}
        </Link>
      </nav>
      <h1 className="text-2xl font-semibold">QCM{quiz ? ` — ${quiz.title}` : ""}</h1>
    </div>
  );
  const errorBox =
    typeof error === "string" ? (
      <ActionError error={error} className="border-destructive rounded-md border p-3" />
    ) : null;

  if (!quiz) {
    return (
      <div className="max-w-3xl space-y-6">
        {heading}
        {errorBox}
        {assessment.is_group_grade ? (
          <p className="text-muted-foreground">
            Un QCM est une évaluation individuelle : cette évaluation est notée par groupe.
          </p>
        ) : (
          <section className="space-y-3">
            <p>
              Les étudiant·es passent le QCM en ligne avec un lien personnel, sans compte. Chacun·e
              reçoit des questions tirées au hasard dans ta banque, différentes d’un·e étudiant·e à
              l’autre ; les choix multiples sont corrigés automatiquement, les réponses libres
              relues par toi.
            </p>
            <form action={createQuiz.bind(null, id, assessmentId)}>
              <Button type="submit">Créer le QCM</Button>
            </form>
          </section>
        )}
      </div>
    );
  }

  const supabase = await createClient();
  const origin = assessment.makeup_of_id ?? assessment.id;
  const [bank, attempts, { data: family }, { count: excusedCount }] = await Promise.all([
    loadBank(),
    listAttempts(quiz.id),
    supabase
      .from("assessment")
      .select("id, makeup_of_id, quiz(status)")
      .or(`id.eq.${origin},makeup_of_id.eq.${origin}`),
    supabase
      .from("grade")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", origin)
      .eq("attendance", "absent_excused"),
  ]);
  const statuses = (family ?? []).flatMap((a) => {
    const q = a.quiz as unknown as
      | { status: "draft" | "published" | "closed" }
      | { status: "draft" | "published" | "closed" }[]
      | null;
    return q ? (Array.isArray(q) ? q : [q]).map((x) => x.status) : [];
  });
  const hiddenReason = familyClosedReason({
    statuses,
    excusedCount: excusedCount ?? 0,
    hasMakeupQuiz: (family ?? []).some((a) => a.makeup_of_id === origin && a.quiz),
  });

  const { eligible: students, absent } = await passingStudents(
    assessmentId,
    gradingTargets(false, assessment.groups).flatMap((t) => t.students),
  );
  const withAttempt = new Set(attempts.map((a) => a.studentId));
  const missing = students.filter((s) => !withAttempt.has(s.id)).length;
  const submitted = attempts.filter((a) => a.status === "submitted").length;
  const toReview = attempts.filter((a) => a.status === "submitted" && !a.reviewComplete).length;
  const closed = quiz.status === "closed";
  const categories = [...new Set(bank.map((q) => q.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );

  return (
    <div className="max-w-4xl space-y-8">
      {heading}
      {errorBox}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={quiz.status === "published" ? "secondary" : "outline"}>
          {STATUS_LABEL[quiz.status]}
        </Badge>
        {assessment.makeup_of_id ? <Badge variant="outline">Rattrapage</Badge> : null}
        {quiz.status === "draft" ? (
          <form action={publishQuiz.bind(null, id, assessmentId)}>
            <Button type="submit" size="sm">
              Publier le QCM
            </Button>
          </form>
        ) : null}
        {quiz.status === "published" ? (
          <>
            <form action={unpublishQuiz.bind(null, id, assessmentId)}>
              <Button type="submit" size="sm" variant="secondary">
                Repasser en brouillon
              </Button>
            </form>
            <form action={closeQuiz.bind(null, id, assessmentId)}>
              <Button type="submit" size="sm" variant="secondary">
                Clôturer le QCM
              </Button>
            </form>
          </>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">
        {submitted}/{attempts.length} copie{attempts.length > 1 ? "s" : ""} rendue
        {submitted > 1 ? "s" : ""}
        {toReview ? ` · ${toReview} à relire` : ""}.
      </p>
      {hiddenReason ? (
        <p role="status" className="rounded-md border p-3 text-sm">
          <strong>Corrigé caché pour les étudiant·es.</strong> {hiddenReason}
        </p>
      ) : (
        <p role="status" className="rounded-md border p-3 text-sm">
          Le QCM est clôturé pour tout le monde : les corrigés sont visibles (selon l’option
          choisie).
        </p>
      )}

      <section aria-labelledby="config" className="space-y-3">
        <h2 id="config" className="text-lg font-medium">
          Configuration
        </h2>
        <QuizConfigForm
          moduleId={id}
          assessmentId={assessmentId}
          quiz={quiz}
          bank={bank.map((q) => ({ id: q.id, category: q.category, type: q.type, tags: q.tags }))}
          categories={categories}
        />
      </section>

      <section aria-labelledby="links" className="space-y-3">
        <h2 id="links" className="text-lg font-medium">
          Liens personnels
        </h2>
        {students.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {assessment.makeup_of_id
              ? "Personne n’est inscrit·e à ce rattrapage."
              : "Aucun·e étudiant·e dans les groupes de cette évaluation."}
          </p>
        ) : (
          <PrepareLinks moduleId={id} assessmentId={assessmentId} missing={missing} />
        )}
        {students.length > 0 ? (
          <p className="text-sm">
            <Link href={`${back}/qr`} className="underline underline-offset-2">
              Projeter un QR code de classe
            </Link>{" "}
            : chaque étudiant·e choisit son nom et passe le QCM, sans lien personnel.
          </p>
        ) : null}
        {absent > 0 ? (
          <p className="text-muted-foreground text-sm">
            {absent} absent·e{absent > 1 ? "s" : ""} déclaré·e{absent > 1 ? "s" : ""} sur
            l’évaluation : pas de lien (une absence excusée se rattrape avec un rattrapage).
          </p>
        ) : null}
      </section>

      {attempts.length > 0 ? (
        <section aria-labelledby="follow" className="space-y-3">
          <h2 id="follow" className="text-lg font-medium">
            Suivi
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <caption className="sr-only">Suivi des copies</caption>
              <thead>
                <tr className="text-left">
                  <th scope="col" className="p-2">
                    Étudiant·e
                  </th>
                  <th scope="col" className="p-2">
                    État
                  </th>
                  <th scope="col" className="p-2">
                    Note
                  </th>
                  <th scope="col" className="p-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-t align-top">
                    <th scope="row" className="p-2 text-left font-medium">
                      {a.name}
                      {a.timeMultiplier > 1 ? (
                        <span className="text-muted-foreground block text-xs font-normal">
                          tiers-temps ×{String(a.timeMultiplier).replace(".", ",")}
                        </span>
                      ) : null}
                      {a.reusedCount > 0 ? (
                        <span className="text-muted-foreground block text-xs font-normal">
                          {a.reusedCount} sur {a.questionCount} déjà vue
                          {a.reusedCount > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </th>
                    <td className="p-2">
                      {attemptStatusLabel(a)}
                      {a.hasLateAnswers ? (
                        <span className="text-destructive block text-xs">
                          Modifications après l’heure limite
                        </span>
                      ) : null}
                    </td>
                    <td className="p-2">{attemptScoreLabel(a)}</td>
                    <td className="p-2">
                      <AttemptActions
                        moduleId={id}
                        assessmentId={assessmentId}
                        attempt={a}
                        quizClosed={closed}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
