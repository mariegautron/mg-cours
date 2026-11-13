"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2 } from "lucide-react";

import {
  publishResults,
  revokeResultLink,
  type PublishState,
} from "@/app/(app)/modules/[id]/assessments/results-links-actions";
import { ActionError } from "@/components/action-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Confirm } from "@/components/modules/student-links-panel";
import { PendingButton } from "@/components/ui/pending-button";
import { Pill } from "@/components/dashboard/pill";
import type { ViewInfo } from "@/lib/result-links/sheet";

export interface PublishStudent {
  id: string;
  name: string;
  /** Lien actif (date de publication et consultation), `null` si pas publié. */
  link: (ViewInfo & { published_at: string }) | null;
  /** Note publiée (sur le barème de l'évaluation), `null` sans note. */
  value?: number | null;
}

/**
 * Publication des résultats dans l'espace personnel de chaque étudiant·e (doublon D29 : l'espace est
 * le seul lien). Rien n'est publié sans confirmation. Plus d'adresse de résultats à copier ni à
 * régénérer ; « Retirer » enlève la note publiée de l'espace. Les anciens liens de résultats déjà
 * donnés continuent de marcher.
 */
export function PublishResults({
  moduleId,
  assessmentId,
  students,
  available,
  spaceStudentIds = [],
}: {
  moduleId: string;
  assessmentId: string;
  students: PublishStudent[];
  available: boolean;
  /** Étudiant·es qui ont un espace personnel actif : leurs notes y arrivent sans lien de résultats. */
  spaceStudentIds?: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const apply = (state: PublishState, ok: string) => {
    if (state.error) {
      setError(state.error);
      return;
    }
    setError(null);
    setMessage(ok);
    router.refresh();
  };

  const published = students.filter((s) => s.link).length;
  const withSpace = students.filter((s) => spaceStudentIds.includes(s.id)).length;
  const withoutSpace = students.length - withSpace;

  if (!available) {
    return (
      <section aria-labelledby="publish" className="space-y-2 rounded-lg border p-4">
        <h2 id="publish" className="text-sm font-semibold">
          Publier les résultats
        </h2>
        <p role="status" className="text-muted-foreground text-sm">
          La publication dans les espaces sera disponible après la mise à jour de la base de
          données. L’envoi par e-mail ci-dessus reste possible.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="publish" className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="publish" className="text-sm font-semibold">
            Publier les résultats
          </h2>
          <p className="text-muted-foreground text-sm">
            Chaque étudiant·e voit sa note dans son espace personnel, et seulement la sienne : rien
            à lui renvoyer.{" "}
            {withoutSpace > 0 ? (
              <>
                {withoutSpace} personne{withoutSpace > 1 ? "s n’ont" : " n’a"} pas encore d’espace :{" "}
                <Link href={`/modules/${moduleId}/frise`} className="underline underline-offset-2">
                  créer {withoutSpace > 1 ? "leurs liens" : "son lien"} dans Espace étudiant·es
                </Link>
                .{" "}
              </>
            ) : null}
            {published} publié{published > 1 ? "s" : ""} sur {students.length}.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <PendingButton type="button" pending={pending} pendingLabel="Publication…">
              <Link2 aria-hidden />
              Publier dans les espaces
            </PendingButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publier les résultats ?</AlertDialogTitle>
              <AlertDialogDescription>
                La note de chaque étudiant·e noté·e apparaît dans son espace personnel. Rien n’est
                envoyé par e-mail. Une note déjà publiée est mise à jour.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ne pas publier</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  start(async () =>
                    apply(
                      await publishResults(moduleId, assessmentId),
                      withSpace > 0
                        ? `Résultats publiés. Visible dans l’espace de ${withSpace} étudiant·e${withSpace > 1 ? "s" : ""}.`
                        : "Résultats publiés.",
                    ),
                  )
                }
              >
                Publier
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p role="status" className="min-h-5 text-sm font-medium">
        {message}
      </p>
      {error ? <ActionError error={error} /> : null}

      <ul className="divide-y text-sm">
        {students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                aria-hidden
                className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              >
                {s.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w.charAt(0).toUpperCase())
                  .join("")}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{s.name}</p>
                <p className="text-muted-foreground">
                  {!spaceStudentIds.includes(s.id)
                    ? "Pas d’espace personnel"
                    : s.link
                      ? "Visible dans son espace"
                      : "Pas publié"}
                </p>
              </div>
            </div>
            <strong className="w-12 text-right tabular-nums">
              {s.value === null || s.value === undefined
                ? "—"
                : s.value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
            </strong>
            {s.link ? <Pill tone="ok">Publié</Pill> : <Pill>Pas publié</Pill>}
            <div className="flex flex-wrap gap-2">
              {s.link ? (
                <>
                  <Confirm
                    variant="ghost"
                    trigger={
                      <>
                        Retirer<span className="sr-only"> la note publiée de {s.name}</span>
                      </>
                    }
                    title={`Retirer la note publiée de ${s.name} ?`}
                    description={`Sa note n’apparaîtra plus dans son espace (ni par un ancien lien de résultats).`}
                    action="Retirer"
                    disabled={pending}
                    onConfirm={() =>
                      start(async () =>
                        apply(
                          await revokeResultLink(moduleId, assessmentId, s.id),
                          `Note de ${s.name} retirée de son espace.`,
                        ),
                      )
                    }
                  />
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
