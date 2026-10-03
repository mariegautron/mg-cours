import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { closeQuizToResults } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { ActionError } from "@/components/action-error";
import { Pill } from "@/components/dashboard/pill";
import { AttemptActions } from "@/components/quiz/attempt-actions";
import { ClassLinkControls } from "@/components/quiz/class-link-controls";
import { PrepareLinks } from "@/components/quiz/links-panel";
import { Button } from "@/components/ui/button";
import { getAssessment } from "@/lib/assessments/queries";
import { gradingTargets } from "@/lib/assessments/targets";
import { clientEnv } from "@/lib/env";
import { canRelease, classUrl } from "@/lib/quiz/class-access";
import { getClassLinkInfo } from "@/lib/quiz/class-queries";
import { getQuizByAssessment, listAttempts, passingStudents } from "@/lib/quiz/queries";
import { attemptScoreLabel, attemptStatusLabel } from "@/lib/quiz/status";

export const metadata: Metadata = { title: "Donner accès au QCM" };

const STATUS_LABEL = { draft: "Brouillon", published: "Publié", closed: "Clôturé" } as const;

/**
 * Donner accès au QCM (maquette « QcmLiens ») : en classe (QR), par lien personnel, et suivi de
 * qui est entré·e. Les jetons restent hachés : un lien ne s'affiche qu'une fois.
 */
export default async function QuizLinksPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/quiz/links">) {
  const { id, assessmentId } = await params;
  const { error } = await searchParams;
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== id) notFound();
  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) notFound();
  const back = `/modules/${id}/assessments/${assessmentId}`;

  const [attempts, { eligible: students, absent }, info] = await Promise.all([
    listAttempts(quiz.id),
    passingStudents(
      assessmentId,
      gradingTargets(false, assessment.groups).flatMap((t) => t.students),
    ),
    getClassLinkInfo(quiz.id),
  ]);
  const withAttempt = new Set(attempts.map((a) => a.studentId));
  const missing = students.filter((s) => !withAttempt.has(s.id)).length;
  const closed = quiz.status === "closed";
  const url = info.token ? classUrl(clientEnv.NEXT_PUBLIC_APP_URL, info.token) : null;
  const svg = url
    ? await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
    : null;
  const inProgress = attempts.filter((a) => a.status === "in_progress").length;
  const done = attempts.filter((a) => a.status === "submitted").length;
  const card = "bg-card rounded-xl border p-5";

  return (
    <div className="flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-[3_1_0] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-primary text-xs font-bold tracking-widest uppercase">Évaluations</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Donner accès au QCM</h1>
          </div>
          <p role="status">
            <Pill tone={quiz.status === "published" ? "wip" : "plain"}>
              {STATUS_LABEL[quiz.status]}
            </Pill>
          </p>
        </div>

        {typeof error === "string" ? (
          <ActionError error={error} className="border-destructive rounded-md border p-3" />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <section aria-labelledby="ma" className={`${card} border-primary/60 space-y-2`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="ma" className="font-heading text-lg font-bold">
                En classe : code et QR
              </h2>
              <Pill tone="ok">Recommandé</Pill>
            </div>
            <p className="text-muted-foreground text-sm">
              Tu projettes un QR code. Chacun·e le scanne avec son téléphone et choisit son nom dans
              la liste.
            </p>
            {!info.available ? (
              <p className="text-sm">
                Le QR code sera disponible après la mise à jour de la base de données. Les liens
                personnels restent utilisables.
              </p>
            ) : url && svg ? (
              <>
                <div
                  role="img"
                  aria-label="QR code vers la page de choix du nom"
                  className="w-32 bg-white p-1 [&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                <p className="text-sm break-all">
                  <a href={url} className="underline underline-offset-2">
                    {url}
                  </a>
                </p>
                <Button asChild size="touch" className="w-full">
                  <Link href={`${back}/quiz/qr`}>Afficher sur l’écran projeté</Link>
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Pas encore de QR code pour ce QCM.</p>
            )}
            {quiz.status !== "published" ? (
              <p className="text-muted-foreground text-xs">
                Le QCM n’est pas publié : les étudiant·es verront « pas encore ouvert ».
              </p>
            ) : null}
            {info.available ? (
              <ClassLinkControls
                moduleId={id}
                assessmentId={assessmentId}
                hasLink={!!info.token}
                releasable={info.claimed
                  .filter((c) => canRelease(c.status))
                  .map((c) => ({ attemptId: c.attemptId, name: c.name }))}
              />
            ) : null}
          </section>

          <section aria-labelledby="mb" className={`${card} space-y-2`}>
            <h2 id="mb" className="font-heading text-lg font-bold">
              Par lien personnel
            </h2>
            <p className="text-muted-foreground text-sm">
              Un lien personnel pour chacun·e : pratique pour les absents ou un rattrapage. Les
              liens ne s’affichent qu’une fois.
            </p>
            {students.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {assessment.makeup_of_id
                  ? "Personne n’est inscrit·e à ce rattrapage."
                  : "Aucun·e étudiant·e dans les groupes de cette évaluation."}
              </p>
            ) : (
              <PrepareLinks moduleId={id} assessmentId={assessmentId} missing={missing} />
            )}
            {absent > 0 ? (
              <p className="text-muted-foreground text-xs">
                {absent} absent·e{absent > 1 ? "s" : ""} déclaré·e{absent > 1 ? "s" : ""} sur
                l’évaluation : pas de lien (une absence excusée se rattrape avec un rattrapage).
              </p>
            ) : null}
          </section>
        </div>

        <section aria-labelledby="follow" className={card}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="follow" className="font-heading text-lg font-bold">
              Suivi des copies
            </h2>
            <span className="text-muted-foreground text-sm">
              {inProgress} en cours, {done} terminé{done > 1 ? "s" : ""}, {missing} pas encore
            </span>
          </div>
          {attempts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune copie préparée : prépare les liens pour commencer.
            </p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Suivi des copies</caption>
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th scope="col" className="p-2 font-medium">
                      Étudiant·e
                    </th>
                    <th scope="col" className="p-2 font-medium">
                      État
                    </th>
                    <th scope="col" className="p-2 font-medium">
                      Note
                    </th>
                    <th scope="col" className="p-2 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id} className="border-b align-top last:border-0">
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
          )}
          <p className="text-muted-foreground mt-2 text-xs">
            Un nom ne peut être pris qu’une fois. Tu vois qui est entré·e, et tu libères un nom si
            quelqu’un s’est trompé.
          </p>
        </section>
      </div>

      <div className="min-w-0 flex-[1_1_0] space-y-4 lg:max-w-xs">
        <section aria-labelledby="ac" className={`${card} space-y-2`}>
          <h2 id="ac" className="font-heading text-lg font-bold">
            Actions
          </h2>
          <div className="flex flex-col gap-2">
            {quiz.status === "published" ? (
              <form action={closeQuizToResults.bind(null, id, assessmentId)}>
                <Button type="submit" size="touch" className="w-full">
                  Clôturer et voir les résultats
                </Button>
              </form>
            ) : null}
            <Button
              asChild
              variant={quiz.status === "published" ? "secondary" : "default"}
              size="touch"
            >
              <Link href={`${back}/quiz/results`}>Voir les résultats</Link>
            </Button>
            <Button asChild variant="ghost" size="touch">
              <Link href={`${back}/quiz`}>← Préparer le QCM</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Le chrono tourne sur le serveur : recharger la page ne redonne pas de temps.
          </p>
        </section>
      </div>
    </div>
  );
}
