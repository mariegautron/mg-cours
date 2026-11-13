import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  AccueilView,
  CoursListView,
  CoursFicheView,
  EspaceLayout,
  EvaluationView,
  EvaluationsListView,
  NotesView,
  ProjetView,
  Empty,
  type EspaceData,
  type EspaceSection,
} from "@/components/modules/espace-views";
import { DepositBox } from "@/components/modules/deposit-box";
import { dueLabel } from "@/lib/modules/espace";
import { getDeposit } from "@/app/espace/[token]/deposit-actions";
import { EspaceError } from "@/components/modules/espace-shell";
import { APP_NAME } from "@/lib/brand";
import { callStudentView, studentFeedbackPath } from "@/lib/modules/student-public";
import { liveQuizForToken } from "@/lib/quiz/espace-attempt";
import { loadPublishedReview } from "@/lib/assessments/review-public";
import { ReviewFeedback } from "@/components/modules/review-feedback";

export const dynamic = "force-dynamic";
// Un seul appel par requête, partagé entre l'aperçu du lien et la page.
const loadView = cache((token: string, count: boolean) => callStudentView(token, count));

/** Aperçu du lien personnel : le nom du module, « Marelle » en second ; jamais le prénom. */
export async function generateMetadata({
  params,
}: PageProps<"/espace/[token]/[[...slug]]">): Promise<Metadata> {
  const { token, slug = [] } = await params;
  const res = await loadView(token, slug.length === 0);
  const title = res.status === "ok" && res.content ? res.content.frise.moduleName : "Mon espace";
  return {
    title,
    description: "Ton espace de cours : séances, documents, évaluations et résultats.",
    openGraph: { title: `${title} · ${APP_NAME}`, siteName: APP_NAME },
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

/** Tableau de bord du cours d'une personne : une seule page à segments, jamais indexée. */
export default async function EspacePage({ params }: PageProps<"/espace/[token]/[[...slug]]">) {
  const { token, slug = [] } = await params;
  const [section, arg] = slug;
  // La consultation n'est comptée qu'à l'accueil.
  const res = await loadView(token, slug.length === 0);
  if (res.status !== "ok") return <EspaceError status={res.status} tone="tu" />;

  if (!res.content) {
    return (
      <main className="mx-auto max-w-2xl space-y-2 p-6">
        <h1 className="text-xl">Bonjour{res.firstName ? ` ${res.firstName}` : ""}</h1>
        <p className="text-muted-foreground">
          L’espace de ce module n’est pas encore publié. Revenez bientôt.
        </p>
      </main>
    );
  }

  const data: EspaceData = {
    token,
    base: `/espace/${token}`,
    firstName: res.firstName,
    frise: res.content.frise,
    espace: res.content.espace,
    results: res.results,
    publishedAt: res.content.publishedAt,
    deposits: undefined,
  };
  // État des dépôts (heure serveur) pour les évaluations rendues dans Marelle.
  if (data.espace && ["accueil", "evaluation"].includes(section ?? "accueil")) {
    const deposits: NonNullable<EspaceData["deposits"]> = {};
    for (const ev of data.espace.evaluations) {
      if (ev.id && ev.submit.mode === "app") {
        const st = await getDeposit(token, ev.id);
        if (st.submittedAt) deposits[ev.id] = { at: st.submittedAt, late: st.lateMinutes };
      }
    }
    data.deposits = deposits;
  }
  // Bandeau du QCM lu en direct : un QCM publié apparaît sans attendre la mise à jour de
  // l'espace ; une copie rendue le dit au lieu d'inviter à passer le QCM.
  if (data.espace && slug.length === 0) {
    const live = await liveQuizForToken(token);
    data.espace = {
      ...data.espace,
      quiz: live
        ? { title: live.title, closesAt: live.closesAt, url: data.espace.quiz?.url ?? null }
        : null,
    };
    data.quizSubmittedAt = live?.submittedAt ?? null;
    data.quizMakeupPlanned = !!live?.makeupPlanned;
  }
  const number = Number(arg);

  let current: EspaceSection;
  let body: React.ReactNode;
  if (slug.length === 0) {
    current = "accueil";
    // Même questionnaire que le lien envoyé à la classe : rien ne dit qui répond.
    const feedback = await studentFeedbackPath(token);
    body = (
      <>
        <AccueilView data={data} />
        {feedback ? (
          <section aria-labelledby="avis" className="bg-card mt-6 space-y-2 rounded-xl border p-5">
            <h2 id="avis" className="text-sm font-semibold">
              Ton avis sur le module
            </h2>
            <p className="text-muted-foreground text-sm">
              5 minutes, aucun lien avec ta note. Ton nom n’est jamais enregistré.
            </p>
            <a
              href={feedback}
              rel="noreferrer"
              className="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-xl px-4 font-semibold"
            >
              Donner ton avis (anonyme)
            </a>
          </section>
        ) : null}
      </>
    );
  } else if (section === "projet" && slug.length === 1) {
    current = "projet";
    body = data.espace ? <ProjetView espace={data.espace} /> : <Empty title="Projet" text="" />;
  } else if (section === "evaluation" && slug.length === 1) {
    current = "evaluation";
    body = <EvaluationsListView data={data} />;
  } else if (section === "evaluation" && slug.length === 2 && Number.isInteger(number)) {
    current = "evaluation";
    const ev = data.espace?.evaluations[number - 1];
    let deposit: React.ReactNode = null;
    if (ev && ev.id && ev.submit.mode === "app") {
      const due =
        ev.date ??
        (ev.sessionNumber
          ? (data.frise.sessions.find((s) => s.number === ev.sessionNumber)?.date ?? null)
          : null);
      deposit = (
        <DepositBox
          token={token}
          assessmentId={ev.id}
          accepts={ev.submit.accepts}
          initial={await getDeposit(token, ev.id)}
          deadlineLabel={dueLabel(due, ev.time)}
        />
      );
    }
    // Point d'étape : le retour publié de Marie, sous le dépôt.
    const review = ev?.id ? await loadPublishedReview(token, ev.id) : null;
    if (review)
      deposit = (
        <>
          {deposit}
          <ReviewFeedback review={review} />
        </>
      );
    body = <EvaluationView data={data} index={number - 1} deposit={deposit} />;
  } else if (section === "cours" && slug.length === 2 && Number.isInteger(number)) {
    // Ancienne adresse d'une séance : on ouvre sa première fiche.
    redirect(`/espace/${token}/cours/${number}/1`);
  } else if (section === "cours" && slug.length <= 3) {
    current = "cours";
    const fiche = Number(slug[2]);
    if (slug.length === 1) {
      body = <CoursListView data={data} />;
    } else if (Number.isInteger(number) && Number.isInteger(fiche)) {
      body = <CoursFicheView data={data} session={number} index={fiche} />;
    } else {
      notFound();
    }
  } else if (section === "notes" && slug.length === 1) {
    current = "notes";
    body = <NotesView data={data} />;
  } else {
    notFound();
  }

  return (
    <EspaceLayout data={data} current={current}>
      {body}
    </EspaceLayout>
  );
}
