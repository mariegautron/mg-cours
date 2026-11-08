import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AccueilView,
  CoursFicheView,
  CoursListView,
  EspaceLayout,
  EvaluationView,
  EvaluationsListView,
  NotesView,
  ProjetView,
  type EspaceData,
  type EspaceSection,
} from "@/components/modules/espace-views";
import { loadEspace } from "@/lib/modules/espace-queries";
import { loadFrise } from "@/lib/modules/frise-queries";
import { getModule } from "@/lib/modules/queries";
import { notebookStudents } from "@/lib/notebook/notebook";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Aperçu de l’espace étudiant·e" };

/**
 * Aperçu en lecture seule de l'espace d'un·e étudiant·e : le contenu qui serait publié maintenant
 * (pas l'ancienne publication). Aucun dépôt, aucune note : rien n'est écrit.
 */
export default async function PreviewPage({
  params,
}: PageProps<"/modules/[id]/apercu/[studentId]/[[...slug]]">) {
  const { id, studentId, slug = [] } = await params;
  const [mod, frise, espace, groups] = await Promise.all([
    getModule(id),
    loadFrise(id),
    loadEspace(id),
    listModuleGroups(id),
  ]);
  if (!mod || !frise) notFound();
  const student = notebookStudents(groups).find((s) => s.id === studentId);
  if (!student && studentId !== "exemple") notFound();

  const base = `/modules/${id}/apercu/${studentId}`;
  const data: EspaceData = {
    token: "apercu",
    base,
    firstName: student?.first_name ?? "Prénom",
    frise,
    espace,
    results: [],
    publishedAt: null,
    deposits: undefined,
  };
  const [section, arg] = slug;
  const number = Number(arg);

  let current: EspaceSection;
  let body: React.ReactNode;
  if (slug.length === 0) {
    current = "accueil";
    body = <AccueilView data={data} />;
  } else if (section === "projet" && slug.length === 1 && espace) {
    current = "projet";
    body = <ProjetView espace={espace} />;
  } else if (section === "evaluation" && slug.length === 1) {
    current = "evaluation";
    body = <EvaluationsListView data={data} />;
  } else if (section === "evaluation" && slug.length === 2 && Number.isInteger(number)) {
    current = "evaluation";
    body = <EvaluationView data={data} index={number - 1} deposit={null} />;
  } else if (section === "cours" && slug.length === 1) {
    current = "cours";
    body = <CoursListView data={data} />;
  } else if (section === "cours" && slug.length === 3) {
    current = "cours";
    body = <CoursFicheView data={data} session={number} index={Number(slug[2])} />;
  } else if (section === "notes" && slug.length === 1) {
    current = "notes";
    body = <NotesView data={data} />;
  } else {
    notFound();
  }

  return (
    <div>
      <div role="note" className="bg-muted border-b px-4 py-2 text-sm">
        <strong>Aperçu en lecture seule</strong> — espace de {data.firstName}, tel qu’il serait
        publié maintenant. Aucun dépôt ni aucune note ne sont enregistrés.{" "}
        <Link href={`/modules/${id}/apercu`} className="underline underline-offset-2">
          Changer d’étudiant·e
        </Link>{" "}
        ·{" "}
        <Link href={`/modules/${id}/frise`} className="underline underline-offset-2">
          Page de publication
        </Link>
      </div>
      <EspaceLayout data={data} current={current}>
        {body}
      </EspaceLayout>
    </div>
  );
}
