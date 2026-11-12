import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getModule } from "@/lib/modules/queries";
import { notebookStudents } from "@/lib/notebook/notebook";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Aperçu de l’espace étudiant·e" };

/** Choix de l'étudiant·e dont on veut voir l'espace (aperçu en lecture seule). */
export default async function PreviewChooserPage({ params }: PageProps<"/modules/[id]/apercu">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();
  const students = notebookStudents(await listModuleGroups(id));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        Voir l’espace d’un·e étudiant·e
      </h1>
      <p className="text-muted-foreground">
        Aperçu en lecture seule, avec ce qui serait publié si tu cliquais « Mettre à jour ». Rien
        n’est envoyé.
      </p>
      {students.length === 0 ? (
        <p role="status">
          Aucun·e étudiant·e dans ce module.{" "}
          <Link href={`/modules/${id}/apercu/exemple`} className="underline underline-offset-2">
            Voir un espace d’exemple
          </Link>
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {students.map((s) => (
            <li key={s.id}>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/modules/${id}/apercu/${s.id}`}>
                  {s.first_name} {s.last_name}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="ghost">
        <Link href={`/modules/${id}/frise`}>← Page de publication</Link>
      </Button>
    </div>
  );
}
