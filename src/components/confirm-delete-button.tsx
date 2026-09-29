"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

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
import { PendingButton } from "@/components/ui/pending-button";

/**
 * Bouton « Supprimer » avec confirmation. Le nom accessible inclut `itemName`
 * (ex. « Supprimer trame.pdf ») ; en mode `iconOnly`, seule l'icône est visible.
 */
export function ConfirmDeleteButton({
  itemName,
  title,
  description,
  onConfirm,
  iconOnly = false,
  touch = false,
}: {
  itemName: string;
  title: string;
  description: string;
  onConfirm: () => Promise<unknown> | void;
  iconOnly?: boolean;
  /** Cible tactile de 44 px (carnet de séance, utilisé debout au téléphone). */
  touch?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <PendingButton
          type="button"
          variant="ghost"
          size={touch ? (iconOnly ? "icon-touch" : "touch") : iconOnly ? "icon" : "sm"}
          pending={pending}
          pendingLabel="Suppression…"
          aria-label={iconOnly ? `Supprimer ${itemName}` : undefined}
        >
          <Trash2 aria-hidden />
          {iconOnly ? null : (
            <>
              Supprimer<span className="sr-only"> {itemName}</span>
            </>
          )}
        </PendingButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => startTransition(async () => void (await onConfirm()))}
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
