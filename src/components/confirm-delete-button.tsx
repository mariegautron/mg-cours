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
import { Button } from "@/components/ui/button";

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
}: {
  itemName: string;
  title: string;
  description: string;
  onConfirm: () => Promise<unknown> | void;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={iconOnly ? "icon" : "sm"}
          disabled={pending}
          aria-label={iconOnly ? `Supprimer ${itemName}` : undefined}
        >
          <Trash2 aria-hidden />
          {iconOnly ? null : (
            <>
              Supprimer<span className="sr-only"> {itemName}</span>
            </>
          )}
        </Button>
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
