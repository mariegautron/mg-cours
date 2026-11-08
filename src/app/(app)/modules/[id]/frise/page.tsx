import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Presentation } from "lucide-react";

import { FriseProjected, FriseStudent } from "@/components/modules/frise-view";
import { ShareLinkPanel } from "@/components/modules/share-link-panel";
import { Button } from "@/components/ui/button";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { canPresent } from "@/lib/assessments/subject";
import { loadEspace } from "@/lib/modules/espace-queries";
import { notebookStudents } from "@/lib/notebook/notebook";
import { listModuleGroups } from "@/lib/students/queries";
import { getShareLinkInfo, getStudentLinkInfo, loadFrise } from "@/lib/modules/frise-queries";

export const metadata: Metadata = { title: "Frise du module" };

export default async function FrisePage({ params }: PageProps<"/modules/[id]/frise">) {
  const { id } = await params;
  const [frise, share, espace, groups, assessments] = await Promise.all([
    loadFrise(id),
    getShareLinkInfo(id),
    loadEspace(id),
    listModuleGroups(id),
    listModuleAssessments(id),
  ]);
  const studentLinks = await getStudentLinkInfo(id, notebookStudents(groups));
  if (!frise) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const card = "bg-card rounded-3xl border p-5 shadow-sm";

  return (
    <div className="mx-auto max-w-[112rem] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Où j’en suis
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">La frise du module</h1>
          <p className="text-muted-foreground mt-1">
            Les séances et les notes en un coup d’œil : à projeter en classe, ou à partager aux
            étudiant·es par un lien.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/present/modules/${id}/frise`}>
              <Presentation aria-hidden />
              Projeter la frise
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/modules/${id}/planning`}>Voir le planning</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/modules/${id}`}>← Retour au module</Link>
          </Button>
        </div>
      </div>

      <p
        role="status"
        className="bg-card flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border px-4 py-3 text-sm"
      >
        {share.active ? (
          <>
            <strong>
              Publié le {new Date(share.active.publishedAt).toLocaleDateString("fr-FR")}
            </strong>
            <span>
              {studentLinks.active} lien{studentLinks.active > 1 ? "s" : ""} actif
              {studentLinks.active > 1 ? "s" : ""}
            </span>
            {share.active.stale ? (
              <a href="#share" className="font-semibold underline underline-offset-2">
                Mettre à jour les cours publiés
              </a>
            ) : (
              <span className="text-muted-foreground">À jour</span>
            )}
          </>
        ) : (
          <>
            <strong>Pas encore publié</strong>
            <a href="#share" className="font-semibold underline underline-offset-2">
              Publier pour les étudiant·es
            </a>
          </>
        )}
      </p>

      <section aria-label="Aperçu de la frise projetée" className={card}>
        <FriseProjected frise={frise} embedded />
      </section>

      <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
        <div className="w-full min-w-0 flex-1 lg:basis-0">
          <ShareLinkPanel
            moduleId={id}
            available={share.available}
            active={share.active}
            studentLinks={studentLinks}
            evaluationList={assessments
              .filter((a) => !a.makeup_of_id)
              .map((a) => ({
                id: a.id,
                title: a.title,
                included: canPresent(a.prep_status),
                reason: !canPresent(a.prep_status)
                  ? "sujet à rédiger"
                  : !a.date && !a.course_id
                    ? "date à renseigner (visible quand même)"
                    : null,
                href: `/modules/${id}/assessments/${a.id}`,
              }))}
            counts={{
              brief: !!espace.brief,
              evaluations: espace.evaluations.length,
              grids: espace.evaluations.filter((e) => e.grid).length,
              resources: espace.courses.reduce((n, c) => n + c.resources.length, 0),
            }}
          />
        </div>
        <section
          aria-labelledby="etu"
          className={`${card} w-full min-w-0 lg:w-[26rem] lg:flex-none`}
        >
          <h2 id="etu" className="font-heading mb-1 text-xl font-bold">
            Ce que voient les étudiant·es
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            La page du lien, sur un téléphone : l’état au moment où tu crées le lien.
          </p>
          <div className="bg-background rounded-2xl border p-4">
            <FriseStudent frise={frise} today={today} embedded />
          </div>
        </section>
      </div>
    </div>
  );
}
