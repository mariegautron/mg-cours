"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { finishModule, undoFinishModule } from "@/app/(app)/modules/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import { UNDO_WINDOW_MS } from "@/lib/modules/archive-undo";

/**
 * « Terminer le module » depuis la liste (US-160) : confirmation, mot privé « Ce que je retiens »
 * (si la table existe), puis un message « Module rangé » avec « Annuler » pendant 10 secondes.
 */
export function FinishModuleButton({
  id,
  name,
  askNote,
  label = "Terminer le module",
  prominent = false,
}: {
  id: string;
  name: string;
  askNote: boolean;
  /** Texte du bouton (« Terminer et ranger », « Écrire mon retour »). */
  label?: string;
  /** Bouton plein (carte « Ce module est terminé ») plutôt que discret. */
  prominent?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      const result = await finishModule(id, askNote ? note : null);
      if (!result.ok || !result.finishedAt) {
        setError(result.error ?? "On n’a pas pu ranger le module. Réessaie.");
        return;
      }
      const token = result.finishedAt!;
      const archivedInstead = result.archivedInstead ?? false;
      setOpen(false);
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

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={prominent ? "default" : "ghost"}
          size={prominent ? "lg" : "touch"}
        >
          {label}
          <span className="sr-only"> : {name}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Terminer « {name} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Il passe dans « Terminés » et sort de « En cours ». Rien n’est effacé, la facture reste
            à faire et tu peux le rouvrir.
          </AlertDialogDescription>
        </AlertDialogHeader>
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
        <AlertDialogFooter>
          <AlertDialogCancel>Garder en cours</AlertDialogCancel>
          <PendingButton
            type="button"
            pending={pending}
            pendingLabel="Rangement…"
            onClick={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            Terminer
          </PendingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
