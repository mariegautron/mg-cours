"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteStudent } from "@/app/(app)/students/actions";
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

export function StudentActions({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <PendingButton
          type="button"
          variant="destructive"
          pending={pending}
          pendingLabel="Suppression…"
        >
          <Trash2 aria-hidden />
          Supprimer
        </PendingButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {name} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Action définitive, dans tous les modules : sa fiche, ses notes, ses appréciations, ses
            observations, ses présences, ses rendus et ses liens d’espace étudiant·e sont effacés,
            et iel est retiré·e de tous ses groupes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => startTransition(() => void deleteStudent(id))}>
            Supprimer {name}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
