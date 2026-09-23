"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteGroup } from "@/app/(app)/modules/[id]/groups/actions";
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

export function DeleteGroupButton({ moduleId, groupId }: { moduleId: string; groupId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" disabled={pending}>
          <Trash2 aria-hidden />
          Supprimer le groupe
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce groupe ?</AlertDialogTitle>
          <AlertDialogDescription>
            Action définitive. Les étudiant·es ne seront pas supprimé·es, seulement retiré·es du
            groupe.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(() => void deleteGroup(moduleId, groupId))}
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
