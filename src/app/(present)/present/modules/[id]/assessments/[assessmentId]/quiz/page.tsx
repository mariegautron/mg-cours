import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { Pill } from "@/components/dashboard/pill";
import { LiveRefresh } from "@/components/quiz/live-refresh";
import { getAssessment } from "@/lib/assessments/queries";
import { clientEnv } from "@/lib/env";
import { classUrl } from "@/lib/quiz/class-access";
import { getClassLinkInfo } from "@/lib/quiz/class-queries";
import { minutesUntil } from "@/lib/quiz/timer";
import { getQuizByAssessment, listAttempts } from "@/lib/quiz/queries";

export const metadata: Metadata = { title: "QCM : QR code de la classe" };

/**
 * QR code de classe projeté (maquette « QcmQrProjete ») : plein écran, sans menu. Aucun nom
 * d'étudiant·e n'y figure : seulement le nombre de personnes entrées.
 */
export default async function ProjectedQuizQrPage({
  params,
}: PageProps<"/present/modules/[id]/assessments/[assessmentId]/quiz">) {
  const { id, assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== id) notFound();
  const quiz = await getQuizByAssessment(assessmentId);
  if (!quiz) notFound();
  const [info, attempts] = await Promise.all([getClassLinkInfo(quiz.id), listAttempts(quiz.id)]);
  const url = info.token ? classUrl(clientEnv.NEXT_PUBLIC_APP_URL, info.token) : null;
  const svg = url
    ? await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
    : null;
  const back = `/modules/${id}/assessments/${assessmentId}/quiz/links`;
  const entered = info.claimed.length;
  const remaining = minutesUntil(quiz.closes_at);

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center gap-8 p-10">
      <LiveRefresh />
      <div>
        <p className="text-muted-foreground text-xl">QCM : {quiz.title}</p>
        <h1 className="font-heading text-6xl leading-tight font-bold tracking-tight">
          Scannez pour passer le QCM
        </h1>
      </div>
      {url && svg ? (
        <div className="flex flex-wrap items-center gap-10">
          <div
            role="img"
            aria-label="QR code vers la page de choix du nom"
            className="w-80 bg-white p-3 [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="min-w-0 space-y-3">
            <p className="text-muted-foreground text-lg">ou saisissez l’adresse</p>
            <p className="font-heading text-2xl font-bold break-all">{url}</p>
            <p className="text-2xl">
              Puis choisissez <strong>votre nom</strong> dans la liste.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xl">
          Pas encore de QR code : crée-le depuis « Donner accès au QCM ».
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <p role="status" className="text-xl">
          {entered} personne{entered > 1 ? "s" : ""} sur {attempts.length || "—"}{" "}
          {entered > 1 ? "sont" : "est"} entrée
          {entered > 1 ? "s" : ""}
        </p>
        {quiz.status !== "published" ? (
          <Pill tone="warn">QCM pas encore publié</Pill>
        ) : remaining !== null ? (
          <span role="timer" aria-label={`Reste ${remaining} minutes`}>
            <Pill tone="wip">Reste {remaining} minutes</Pill>
          </span>
        ) : null}
      </div>
      <p>
        <Link href={back} className="text-muted-foreground text-sm underline underline-offset-2">
          ← Retour à « Donner accès au QCM »
        </Link>
      </p>
    </main>
  );
}
