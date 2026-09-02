"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";

import { archiveResource, deleteResource, unarchiveResource } from "@/app/(app)/resources/actions";
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

export function ResourceActions({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(() => {
            void (archived ? unarchiveResource(id) : archiveResource(id));
          })
        }
      >
        {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        {archived ? "Désarchiver" : "Archiver"}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={pending}>
            <Trash2 aria-hidden />
            Supprimer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ressource ?</AlertDialogTitle>
            <AlertDialogDescription>
              Action définitive. Les liens vers les cours qui l’utilisent seront retirés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => startTransition(() => void deleteResource(id))}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
