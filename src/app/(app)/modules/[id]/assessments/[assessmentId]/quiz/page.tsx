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
import { Pill } from "@/components/dashboard/pill";
import { QuizConfigForm } from "@/components/quiz/quiz-config-form";
import { Button } from "@/components/ui/button";
import { getAssessment } from "@/lib/assessments/queries";
import { getQuizByAssessment, getQuizPool, listAttempts, loadBank } from "@/lib/quiz/queries";
import { quizTotalPoints } from "@/lib/quiz/draw";
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
            <p className="text-sm">
              Ou{" "}
              <Link href={`${back}/generate`} className="underline underline-offset-2">
                générer un QCM depuis les questions de tes ressources
              </Link>
              .
            </p>
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

  const pool = await getQuizPool(quiz.id);
  const submitted = attempts.filter((a) => a.status === "submitted").length;
  const toReview = attempts.filter((a) => a.status === "submitted" && !a.reviewComplete).length;
  const categories = [...new Set(bank.map((q) => q.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );

  const total = quizTotalPoints(quiz.rules);
  const perStudent = quiz.rules.reduce((n, r) => n + r.count, 0);
  const card = "bg-card rounded-xl border p-5";

  return (
    <div className="flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-start">
      <section aria-labelledby="qp" className={`${card} min-w-0 flex-[3_1_0] space-y-4`}>
        <div className="space-y-1">
          <nav aria-label="Fil d’Ariane" className="text-muted-foreground text-sm">
            <Link href={back} className="underline-offset-2 hover:underline">
              {assessment.title}
            </Link>
          </nav>
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Évaluations</p>
          <h1 id="qp" className="font-heading text-3xl font-bold tracking-tight">
            QCM{quiz ? ` — ${quiz.title}` : ""}
          </h1>
          <p className="text-muted-foreground text-sm">
            Évaluation individuelle sous forme de QCM, tirage différent pour chaque personne.
          </p>
        </div>
        {errorBox}
        <div className="flex flex-wrap items-center gap-2">
          <Pill
            tone={quiz.status === "published" ? "ok" : quiz.status === "closed" ? "plain" : "warn"}
          >
            {STATUS_LABEL[quiz.status]}
          </Pill>
          {assessment.makeup_of_id ? <Pill>Rattrapage</Pill> : null}
        </div>
        <dl className="divide-y text-sm">
          <div className="flex justify-between gap-3 py-2">
            <dt>Questions tirées par personne</dt>
            <dd className="font-semibold">
              {perStudent}
              {pool ? ` sur ${pool.size}` : bank.length ? ` (banque : ${bank.length})` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt>Durée</dt>
            <dd className="font-semibold">
              {quiz.duration_minutes ? `${quiz.duration_minutes} minutes` : "Pas de limite"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt>Tirage</dt>
            <dd>
              Individuel
              {quiz.shuffle_questions || quiz.shuffle_choices
                ? " : questions et réponses mélangées"
                : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-2">
            <dt>Note</dt>
            <dd>Sur {total} points</dd>
          </div>
        </dl>

        {pool ? (
          <p role="status" className="rounded-md border p-3 text-sm">
            Ce QCM pioche dans {pool.size} question{pool.size > 1 ? "s" : ""} choisie
            {pool.size > 1 ? "s" : ""}.{" "}
            {quiz.status === "draft" && attempts.length === 0 ? (
              <Link href={`${back}/generate`} className="underline underline-offset-2">
                Changer les questions
              </Link>
            ) : null}
          </p>
        ) : null}

        <h2 id="config" className="font-heading pt-1 text-lg font-bold">
          Configuration
        </h2>
        <QuizConfigForm
          moduleId={id}
          assessmentId={assessmentId}
          quiz={quiz}
          bank={bank.map((q) => ({ id: q.id, category: q.category, type: q.type, tags: q.tags }))}
          categories={categories}
        />
        {hiddenReason ? (
          <p role="status" className="text-muted-foreground text-sm">
            <strong className="text-foreground">Corrigé caché pour les étudiant·es.</strong>{" "}
            {hiddenReason}
          </p>
        ) : (
          <p role="status" className="text-muted-foreground text-sm">
            Le QCM est clôturé pour tout le monde : les corrigés sont visibles (selon l’option
            choisie).
          </p>
        )}
      </section>

      <div className="min-w-0 flex-[2_1_0] space-y-4 lg:max-w-md">
        <section
          aria-labelledby="pr"
          className="bg-primary/10 border-primary/50 space-y-2 rounded-xl border p-5"
        >
          <h2 id="pr" className="font-heading text-xl font-bold">
            Prêt ?
          </h2>
          <p className="text-muted-foreground text-sm">
            Chaque étudiant·e a un lien personnel. Personne ne voit les réponses avant d’avoir
            envoyé les siennes.
          </p>
          <p className="text-muted-foreground text-sm">
            {submitted}/{attempts.length} copie{attempts.length > 1 ? "s" : ""} rendue
            {submitted > 1 ? "s" : ""}
            {toReview ? ` · ${toReview} à relire` : ""}.
          </p>
          <div className="flex flex-col gap-2">
            {quiz.status === "draft" ? (
              <form action={publishQuiz.bind(null, id, assessmentId)}>
                <Button type="submit" size="touch" variant="secondary" className="w-full">
                  Publier le QCM
                </Button>
              </form>
            ) : null}
            {quiz.status === "published" ? (
              <>
                <form action={unpublishQuiz.bind(null, id, assessmentId)}>
                  <Button type="submit" size="touch" variant="secondary" className="w-full">
                    Repasser en brouillon
                  </Button>
                </form>
                <form action={closeQuiz.bind(null, id, assessmentId)}>
                  <Button type="submit" size="touch" variant="secondary" className="w-full">
                    Clôturer le QCM
                  </Button>
                </form>
              </>
            ) : null}
            <Button asChild size="touch">
              <Link href={`${back}/quiz/links`}>Préparer les liens personnels</Link>
            </Button>
          </div>
        </section>
        {quiz.status === "draft" && attempts.length === 0 ? (
          <Button asChild variant="ghost" size="touch">
            <Link href={`${back}/generate`}>Générer depuis les questions des ressources</Link>
          </Button>
        ) : null}
        <div>
          <Button asChild variant="ghost" size="touch">
            <Link href="/questions">← Banque de questions</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
