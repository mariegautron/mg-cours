"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2 } from "lucide-react";

import {
  publishResults,
  regenerateResultLink,
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
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { allLinksText, viewStatus, type ViewInfo } from "@/lib/result-links/sheet";

export interface PublishStudent {
  id: string;
  name: string;
  /** Lien actif (date de publication et consultation), `null` si pas publié. */
  link: (ViewInfo & { published_at: string }) | null;
}

/**
 * Publication des résultats par lien personnel (US-147). Rien n'est publié sans confirmation. Les
 * liens ne s'affichent qu'une fois (seul leur haché est conservé) : copie-les tout de suite, ou
 * régénère-en un. Le suivi dit seulement si le lien a été ouvert (jamais d'adresse IP).
 */
export function PublishResults({
  moduleId,
  assessmentId,
  students,
  available,
}: {
  moduleId: string;
  assessmentId: string;
  students: PublishStudent[];
  available: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const apply = (state: PublishState, ok: string) => {
    if (state.error) {
      setError(state.error);
      return;
    }
    setError(null);
    if (state.created?.length) {
      setUrls((u) => ({
        ...u,
        ...Object.fromEntries(state.created!.map((c) => [c.studentId, c.url])),
      }));
    }
    setMessage(ok);
    router.refresh();
  };

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copié.`);
    } catch {
      setMessage("Copie impossible depuis ce navigateur : sélectionne le lien à la main.");
    }
  }

  const lines = students.flatMap((s) => (urls[s.id] ? [{ name: s.name, url: urls[s.id] }] : []));
  const published = students.filter((s) => s.link).length;

  if (!available) {
    return (
      <section aria-labelledby="publish" className="space-y-2 rounded-lg border p-4">
        <h2 id="publish" className="text-lg font-medium">
          Publier les résultats
        </h2>
        <p role="status" className="text-muted-foreground text-sm">
          La publication par lien personnel sera disponible après la mise à jour de la base de
          données. L’envoi par e-mail ci-dessus reste possible.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="publish" className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="publish" className="text-lg font-medium">
            Publier les résultats
          </h2>
          <p className="text-muted-foreground text-sm">
            Chaque étudiant·e reçoit un lien personnel et ne voit que son propre résultat.{" "}
            {published} lien{published > 1 ? "s" : ""} publié{published > 1 ? "s" : ""} sur{" "}
            {students.length}.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <PendingButton type="button" pending={pending} pendingLabel="Publication…">
              <Link2 aria-hidden />
              Publier les résultats
            </PendingButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publier les résultats ?</AlertDialogTitle>
              <AlertDialogDescription>
                Un lien personnel est créé pour chaque étudiant·e noté·e. Rien n’est envoyé : c’est
                toi qui leur donnes leur lien. Une personne qui a déjà un lien le garde, avec ses
                résultats mis à jour.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ne pas publier</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  start(async () =>
                    apply(await publishResults(moduleId, assessmentId), "Résultats publiés."),
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

      {lines.length > 0 ? (
        <div className="space-y-2 rounded-md border border-dashed p-3 text-sm">
          <p>
            <strong>Copie ces liens maintenant</strong> : ils ne s’affichent qu’une fois. Ils sont
            personnels : ne les partage qu’avec chaque personne.
          </p>
          <Button
            type="button"
            size="touch"
            variant="secondary"
            onClick={() => void copy(allLinksText(lines), "Tous les liens")}
          >
            <Copy aria-hidden />
            Tout copier
          </Button>
        </div>
      ) : null}

      <ul className="divide-y text-sm">
        {students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-muted-foreground">
                {s.link ? `Publié · ${viewStatus(s.link)}` : "Pas publié"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {urls[s.id] ? (
                <Button
                  type="button"
                  size="touch"
                  variant="outline"
                  onClick={() => void copy(urls[s.id], `Lien de ${s.name}`)}
                >
                  <Copy aria-hidden />
                  Copier le lien<span className="sr-only"> de {s.name}</span>
                </Button>
              ) : null}
              {s.link ? (
                <>
                  <Button
                    type="button"
                    size="touch"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      start(async () =>
                        apply(
                          await regenerateResultLink(moduleId, assessmentId, s.id),
                          `Nouveau lien pour ${s.name} : copie-le maintenant.`,
                        ),
                      )
                    }
                  >
                    Régénérer<span className="sr-only"> le lien de {s.name}</span>
                  </Button>
                  <Button
                    type="button"
                    size="touch"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      start(async () =>
                        apply(
                          await revokeResultLink(moduleId, assessmentId, s.id),
                          `Lien de ${s.name} révoqué.`,
                        ),
                      )
                    }
                  >
                    Révoquer<span className="sr-only"> le lien de {s.name}</span>
                  </Button>
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
