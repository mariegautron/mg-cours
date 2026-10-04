"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  archiveModule,
  finishModule,
  reopenModule,
  undoFinishModule,
  unarchiveModule,
} from "@/app/(app)/modules/actions";
import { DeleteModuleDialog } from "@/components/modules/delete-module-dialog";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import { archivedMessage, UNDO_WINDOW_MS } from "@/lib/modules/archive-undo";
import type { ModuleListState } from "@/lib/modules/list-state";

const BTN =
  "focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none";

/**
 * Actions rapides d'une ligne de module (maquette « Modules ») : Terminer (avec confirmation
 * dans la ligne), Facture, Ranger (avec « Annuler » pendant 10 s), Rouvrir, Restaurer.
 */
export function ModuleRowActions({
  id,
  name,
  state,
  askNote,
}: {
  id: string;
  name: string;
  state: ModuleListState;
  askNote: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const finish = () =>
    start(async () => {
      const result = await finishModule(id, askNote ? note : null);
      if (!result.ok || !result.finishedAt) {
        setError(result.error ?? "On n’a pas pu terminer le module. Réessaie.");
        return;
      }
      const token = result.finishedAt;
      const archivedInstead = result.archivedInstead ?? false;
      setConfirming(false);
      setNote("");
      setError(null);
      toast.success(`« ${name} » est terminé.`, {
        description: "Il est dans « Terminés ». Tu peux le rouvrir.",
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Annuler",
          onClick: () =>
            void undoFinishModule(id, token, archivedInstead).then((r) => {
              if (r.ok) toast.success(`« ${name} » est de retour dans les modules en cours.`);
              else toast.error(r.error ?? "On n’a pas pu annuler.");
              router.refresh();
            }),
        },
      });
      router.refresh();
    });

  const archive = () =>
    start(async () => {
      await archiveModule(id);
      toast.success(archivedMessage(name), {
        description: "Il est dans « Rangés ». Tu peux le restaurer.",
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Annuler",
          onClick: () =>
            void unarchiveModule(id).then(() => {
              toast.success(`« ${name} » est de retour dans la liste.`);
              router.refresh();
            }),
        },
      });
      router.refresh();
    });

  const reopen = () =>
    start(async () => {
      const r = await reopenModule(id);
      if (!r.ok) toast.error(r.error ?? "On n’a pas pu rouvrir le module.");
      else toast.success(`« ${name} » est de nouveau en cours.`);
      router.refresh();
    });

  const restore = () =>
    start(async () => {
      await unarchiveModule(id);
      toast.success(`« ${name} » est de retour dans la liste.`);
      router.refresh();
    });

  return (
    <>
      {state === "running" || state === "taught" ? (
        <button
          type="button"
          className={BTN}
          aria-expanded={confirming}
          onClick={() => setConfirming(true)}
        >
          Terminer<span className="sr-only"> : {name}</span>
        </button>
      ) : null}
      {state === "taught" || state === "finished" ? (
        <Link href={`/modules/${id}/billing`} className={BTN}>
          Facture<span className="sr-only"> : {name}</span>
        </Link>
      ) : null}
      {state === "finished" ? (
        <>
          <button type="button" className={BTN} disabled={pending} onClick={reopen}>
            Rouvrir<span className="sr-only"> : {name}</span>
          </button>
          <button type="button" className={BTN} disabled={pending} onClick={archive}>
            Ranger<span className="sr-only"> : {name}</span>
          </button>
        </>
      ) : null}
      {state === "archived" ? (
        <button type="button" className={BTN} disabled={pending} onClick={restore}>
          Restaurer<span className="sr-only"> : {name}</span>
        </button>
      ) : null}

      <details className="relative">
        <summary
          className={`${BTN} cursor-pointer list-none`}
          aria-label={`Plus d’actions : ${name}`}
        >
          ⋯
        </summary>
        <div className="bg-popover absolute right-0 z-10 mt-1 rounded-xl border p-2 shadow-lg">
          <DeleteModuleDialog id={id} name={name} variant="outline" />
        </div>
      </details>

      {confirming ? (
        <div
          role="alertdialog"
          aria-label="Terminer le module"
          className="bg-primary/10 border-primary/50 order-last basis-full space-y-2 rounded-2xl border p-4"
        >
          <p className="font-semibold">Terminer « {name} » ?</p>
          <p className="text-muted-foreground text-sm">
            Il passe en lecture seule et sort de « En cours ». Tu peux le rouvrir.
          </p>
          {askNote ? (
            <div className="space-y-1">
              <Label htmlFor={`retro-${id}`}>Ce que je retiens (pour toi seule, facultatif)</Label>
              <Textarea
                id={`retro-${id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={4000}
              />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <PendingButton
              type="button"
              pending={pending}
              pendingLabel="Un instant…"
              onClick={finish}
            >
              Terminer
            </PendingButton>
            <button type="button" className={BTN} onClick={() => setConfirming(false)}>
              Garder en cours
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
