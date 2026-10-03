"use client";

import { useActionState, useTransition } from "react";
import { CheckCheck, Download, ExternalLink } from "lucide-react";

import { ActionError } from "@/components/action-error";
import { Celebration } from "@/components/celebration";
import {
  generateOutline,
  markOutlineSent,
  markOutlineValidated,
  type OutlineActionState,
} from "@/app/(app)/modules/[id]/outline/actions";
import { Pill } from "@/components/dashboard/pill";
import { DownloadButton } from "@/components/download-button";
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

const initial: OutlineActionState = {};

const card = "bg-card rounded-3xl border p-5 shadow-sm";

/** Aperçu schématique du PDF : une page, jamais le vrai contenu. */
function PagePreview() {
  const widths = [70, 55, 90, 85, 75, 90, 80, 60, 88, 70];
  return (
    <div
      role="img"
      aria-label="Aperçu schématique du PDF de la progression pédagogique"
      className="flex h-[17rem] w-44 flex-none flex-col gap-2 overflow-hidden rounded-lg border bg-white p-5 text-neutral-800 shadow-sm"
    >
      <div className="text-[0.65rem] font-bold">PROGRESSION PÉDAGOGIQUE</div>
      {widths.map((w, i) => (
        <div
          key={i}
          className={`h-1.5 rounded bg-neutral-200 ${i === 2 || i === 5 || i === 8 ? "mt-2" : ""}`}
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Deux cartes de la maquette « Progression pédagogique » : « Le document » (1 · générer,
 * 2 · télécharger) et « Une fois envoyée à l'école » (3 · confirmer l'envoi, puis la validation).
 */
export function OutlineActions({
  moduleId,
  status,
  hasDepositedOutline = false,
  archived = false,
  generatedLabel,
  deposited,
}: {
  moduleId: string;
  /** `null` = trame jamais générée. */
  status: "draft" | "sent" | "validated" | null;
  /** Une trame déjà envoyée est déposée en PDF (voir « Documents ») : elle fait foi. */
  hasDepositedOutline?: boolean;
  /** Module archivé : plus besoin de générer ou d'envoyer une nouvelle trame. */
  archived?: boolean;
  /** « Générée le 03/10/2026 · envoyée le … », prêt à afficher. */
  generatedLabel: string | null;
  /** PDF déposé par Marie (version envoyée à l'école). */
  deposited: { id: string; date: string } | null;
}) {
  const [genState, genAction, genPending] = useActionState(
    generateOutline.bind(null, moduleId),
    initial,
  );
  const [sentState, sentAction] = useActionState(markOutlineSent.bind(null, moduleId), initial);
  const [valState, valAction] = useActionState(markOutlineValidated.bind(null, moduleId), initial);
  // « J'ai envoyé » / « validée » ne se défont pas : un dialogue court demande confirmation.
  const [sentPending, startSent] = useTransition();
  const [valPending, startValidated] = useTransition();
  const error = genState.error ?? sentState.error ?? valState.error;
  const canSend = status === "draft" && !hasDepositedOutline && !archived;

  return (
    <div className="space-y-4">
      <section aria-labelledby="gen" className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="gen" className="font-heading text-xl font-bold">
            Le document
          </h2>
          {deposited ? <Pill tone="ok">Progression envoyée</Pill> : null}
          {!deposited && status === "validated" ? <Pill tone="ok">Validée</Pill> : null}
          {!deposited && status === "sent" ? <Pill tone="wip">Envoyée</Pill> : null}
        </div>
        <div className="flex flex-wrap gap-5">
          <PagePreview />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
            <p className="text-muted-foreground text-sm">
              {deposited
                ? `PDF déposé le ${deposited.date} : c’est la version envoyée à l’école.`
                : (generatedLabel ?? "Pas encore générée.")}
            </p>
            {deposited && generatedLabel ? (
              <p className="text-muted-foreground text-sm">{generatedLabel}</p>
            ) : null}
            {!archived ? (
              <form action={genAction}>
                <PendingButton
                  type="submit"
                  variant={status ? "secondary" : "default"}
                  className="w-full"
                  pending={genPending}
                  pendingLabel="Génération…"
                >
                  {hasDepositedOutline
                    ? "1 · Générer une progression depuis les séances"
                    : status
                      ? "1 · Régénérer la progression"
                      : "1 · Générer la progression"}
                </PendingButton>
              </form>
            ) : null}
            {status ? (
              <DownloadButton
                href={`/api/modules/${moduleId}/outline`}
                doneLabel="Progression téléchargée."
              >
                2 · Télécharger le PDF
              </DownloadButton>
            ) : (
              <Button type="button" variant="outline" aria-disabled="true" className="opacity-60">
                2 · Télécharger le PDF
              </Button>
            )}
            {deposited ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <a href={`/api/modules/${moduleId}/documents/${deposited.id}`}>
                    <Download aria-hidden />
                    Télécharger le PDF déposé
                  </a>
                </Button>
                <Button asChild variant="secondary">
                  <a
                    href={`/api/modules/${moduleId}/documents/${deposited.id}?inline=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink aria-hidden />
                    Voir
                    <span className="sr-only"> — s’ouvre dans un nouvel onglet</span>
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="env" className={card}>
        <h2 id="env" className="font-heading mb-1.5 text-xl font-bold">
          Une fois envoyée à l’école
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          L’envoi se fait de ton côté (Moodle, e-mail). Reviens ici ensuite.
        </p>
        <div className="flex flex-wrap gap-2">
          {canSend ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <PendingButton
                  type="button"
                  variant="secondary"
                  pending={sentPending}
                  pendingLabel="Enregistrement…"
                >
                  3 · J’ai envoyé la progression à l’école
                </PendingButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tu as bien envoyé la progression à l’école ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Les rappels J-15 et J-7 s’arrêtent, et ça ne se défait pas. Si tu ne l’as pas
                    encore envoyée, télécharge le PDF et envoie-le d’abord.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Pas encore</AlertDialogCancel>
                  <AlertDialogAction onClick={() => startSent(() => sentAction())}>
                    Oui, je l’ai envoyée
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : status === "sent" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <PendingButton
                  type="button"
                  variant="secondary"
                  pending={valPending}
                  pendingLabel="Enregistrement…"
                >
                  <CheckCheck aria-hidden />4 · L’école l’a validée
                </PendingButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>L’école a bien validé la progression ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tu ne pourras pas revenir en arrière une fois validée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Pas encore</AlertDialogCancel>
                  <AlertDialogAction onClick={() => startValidated(() => valAction())}>
                    Oui, elle est validée
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : hasDepositedOutline ? null : (
            <Button type="button" variant="outline" aria-disabled="true" className="opacity-60">
              3 · J’ai envoyé la progression à l’école
            </Button>
          )}
        </div>
        <p className="text-muted-foreground mt-2.5 text-[0.8rem]">
          {status === "validated"
            ? "Progression validée par l’école."
            : status === "sent" || hasDepositedOutline
              ? "Les rappels J-15 et J-7 sont arrêtés."
              : "Après ce clic : les rappels J-15 et J-7 s’arrêtent. Un dialogue te demande confirmation."}
        </p>
        <div aria-live="polite">
          {sentState.done ? (
            <Celebration>Progression envoyée. Les rappels s’arrêtent : bien joué.</Celebration>
          ) : null}
        </div>
        {error ? <ActionError error={error} className="mt-2" /> : null}
      </section>
    </div>
  );
}
