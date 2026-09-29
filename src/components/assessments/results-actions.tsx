"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";

import { ActionError } from "@/components/action-error";
import {
  sendResultsEmail,
  type EmailState,
} from "@/app/(app)/modules/[id]/assessments/email-action";
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
import { DownloadButton } from "@/components/download-button";
import { PendingButton } from "@/components/ui/pending-button";
import type { ResultsRecipients } from "@/lib/assessments/results";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

export function ResultsActions({
  moduleId,
  assessmentId,
  hasGrades,
  recipients,
  sentAt,
}: {
  moduleId: string;
  assessmentId: string;
  hasGrades: boolean;
  recipients: ResultsRecipients;
  sentAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<EmailState | null>(null);

  if (!hasGrades) {
    return (
      <p className="text-muted-foreground text-sm">
        Saisis au moins une note pour exporter ou envoyer les résultats.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <DownloadButton
          href={`/api/modules/${moduleId}/assessments/${assessmentId}/results`}
          doneLabel="Résultats téléchargés."
        >
          Exporter les résultats (PDF)
        </DownloadButton>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <PendingButton
              type="button"
              size="sm"
              variant="secondary"
              pending={pending}
              pendingLabel="Envoi…"
              disabled={recipients.emails === 0}
            >
              <Mail aria-hidden />
              Envoyer par e-mail
            </PendingButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Envoyer les résultats par e-mail ?</AlertDialogTitle>
              <AlertDialogDescription>
                Chaque étudiant·e reçoit un e-mail personnel (jamais les adresses des autres) avec
                sa fiche : note, palier de chaque critère, commentaires, points forts et progrès, en
                PDF aussi. {recipients.emails} destinataire{recipients.emails > 1 ? "s" : ""}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {sentAt ? (
              <p className="rounded-md border border-amber-500/50 p-2 text-sm">
                <strong>Déjà envoyés le {dateTime(sentAt)}.</strong> Un nouvel envoi renverra un
                e-mail à chaque destinataire.
              </p>
            ) : null}
            {recipients.withoutEmail.length ? (
              <div className="text-sm">
                <p className="font-medium">
                  Sans e-mail, non envoyé ({recipients.withoutEmail.length}) :
                </p>
                <ul className="text-muted-foreground list-inside list-disc">
                  {recipients.withoutEmail.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  startTransition(async () =>
                    setState(await sendResultsEmail(moduleId, assessmentId)),
                  )
                }
              >
                {sentAt ? "Renvoyer" : "Envoyer"} à {recipients.emails} destinataire
                {recipients.emails > 1 ? "s" : ""}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {state?.error ? <ActionError error={state.error} /> : null}
      {recipients.emails === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun·e étudiant·e noté·e n’a d’adresse e-mail : envoi impossible.
        </p>
      ) : sentAt && !state ? (
        <p className="text-muted-foreground text-sm">Résultats envoyés le {dateTime(sentAt)}.</p>
      ) : null}
      {state?.sent !== undefined && !state.error ? (
        <p role="status" className="text-sm">
          {state.sent} e-mail{state.sent > 1 ? "s" : ""} envoyé{state.sent > 1 ? "s" : ""}.
          {state.skipped?.length ? ` Sans e-mail : ${state.skipped.join(", ")}.` : ""}
        </p>
      ) : null}
    </div>
  );
}
