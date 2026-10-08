import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  AccueilView,
  CoursListView,
  CoursFicheView,
  EspaceLayout,
  EvaluationView,
  NotesView,
  ProjetView,
  Empty,
  type EspaceData,
  type EspaceSection,
} from "@/components/modules/espace-views";
import { EspaceError } from "@/components/modules/espace-shell";
import { callStudentView } from "@/lib/modules/student-public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Tableau de bord du cours d'une personne : une seule page à segments, jamais indexée. */
export default async function EspacePage({ params }: PageProps<"/espace/[token]/[[...slug]]">) {
  const { token, slug = [] } = await params;
  const [section, arg] = slug;
  // La consultation n'est comptée qu'à l'accueil.
  const res = await callStudentView(token, slug.length === 0);
  if (res.status !== "ok") return <EspaceError status={res.status} />;

  if (!res.content) {
    return (
      <main className="mx-auto max-w-2xl space-y-2 p-6">
        <h1 className="font-heading text-3xl font-bold">
          Bonjour{res.firstName ? ` ${res.firstName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          L’espace de ce module n’est pas encore publié. Revenez bientôt.
        </p>
      </main>
    );
  }

  const data: EspaceData = {
    base: `/espace/${token}`,
    firstName: res.firstName,
    frise: res.content.frise,
    espace: res.content.espace,
    results: res.results,
    publishedAt: res.content.publishedAt,
  };
  const number = Number(arg);

  let current: EspaceSection;
  let body: React.ReactNode;
  if (slug.length === 0) {
    current = "accueil";
    body = <AccueilView data={data} />;
  } else if (section === "projet" && slug.length === 1) {
    current = "projet";
    body = data.espace ? <ProjetView espace={data.espace} /> : <Empty title="Projet" text="" />;
  } else if (section === "evaluation" && slug.length === 2 && Number.isInteger(number)) {
    current = "evaluation";
    body = <EvaluationView data={data} index={number - 1} />;
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
