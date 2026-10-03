import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { ClassLinkControls } from "@/components/quiz/class-link-controls";
import { getAssessment } from "@/lib/assessments/queries";
import { clientEnv } from "@/lib/env";
import { canRelease, classUrl } from "@/lib/quiz/class-access";
import { getClassLinkInfo } from "@/lib/quiz/class-queries";
import { getQuizByAssessment } from "@/lib/quiz/queries";

const ATTEMPT_LABELS: Record<string, string> = {
  ready: "Pas commencée",
  in_progress: "En cours",
  submitted: "Rendue",
};

export const metadata: Metadata = { title: "QR code du QCM" };

export default async function QuizQrPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/quiz/qr">) {
  const { id, assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== id) notFound();
  const quiz = await getQuizByAssessment(assessmentId);
  const back = `/modules/${id}/assessments/${assessmentId}/quiz`;
  if (!quiz) notFound();
  const info = await getClassLinkInfo(quiz.id);
  const url = info.token ? classUrl(clientEnv.NEXT_PUBLIC_APP_URL, info.token) : null;
  const svg = url
    ? await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link
          href={back}
          className="text-muted-foreground text-sm underline-offset-2 hover:underline"
        >
          ← QCM « {quiz.title} »
        </Link>
        <h1 className="text-2xl font-semibold">QR code de la classe</h1>
        <p className="text-muted-foreground">
          Projette ce QR code : chaque étudiant·e choisit son nom dans la liste et passe le QCM. Un
          nom ne peut être pris qu’une fois. Les copies doivent être préparées (« Liens personnels
          »).
        </p>
      </div>

      {!info.available ? (
        <p className="rounded-md border p-4 text-sm">
          Le QR code sera disponible après la mise à jour de la base de données. Les liens
          personnels restent utilisables.
        </p>
      ) : (
        <>
          {url && svg ? (
            <section aria-labelledby="qr" className="space-y-3 rounded-lg border p-4 text-center">
              <h2 id="qr" className="sr-only">
                QR code à projeter
              </h2>
              <div
                role="img"
                aria-label="QR code vers la page de choix du nom"
                className="mx-auto w-full max-w-sm bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <p className="text-lg font-medium break-all">
                <a href={url} className="underline underline-offset-2">
                  {url}
                </a>
              </p>
              {quiz.status !== "published" ? (
                <p role="status" className="text-sm">
                  Le QCM n’est pas publié : les étudiant·es verront « pas encore ouvert ».
                </p>
              ) : null}
            </section>
          ) : (
            <p className="text-muted-foreground text-sm">Pas encore de QR code pour ce QCM.</p>
          )}

          <section aria-labelledby="claimed" className="space-y-2">
            <h2 id="claimed" className="text-lg font-medium">
              Noms pris ({info.claimed.length})
            </h2>
            {info.claimed.length === 0 ? (
              <p className="text-muted-foreground text-sm">Personne n’a encore choisi son nom.</p>
            ) : (
              <ul className="divide-y rounded-lg border text-sm">
                {info.claimed.map((c) => (
                  <li key={c.attemptId} className="flex flex-wrap justify-between gap-2 p-2">
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">
                      {ATTEMPT_LABELS[c.status] ?? c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted-foreground text-xs">
              Choisir un nom crée un nouveau lien pour la copie : un lien envoyé auparavant par
              e-mail cesse alors de fonctionner.
            </p>
          </section>

          <section aria-labelledby="controls" className="space-y-2">
            <h2 id="controls" className="text-lg font-medium">
              Gérer
            </h2>
            <ClassLinkControls
              moduleId={id}
              assessmentId={assessmentId}
              hasLink={!!info.token}
              releasable={info.claimed
                .filter((c) => canRelease(c.status))
                .map((c) => ({ attemptId: c.attemptId, name: c.name }))}
            />
          </section>
        </>
      )}
    </div>
  );
}
