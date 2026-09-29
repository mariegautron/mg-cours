"use client";

import { useState, useTransition } from "react";
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
import { PendingButton } from "@/components/ui/pending-button";

export function ResourceActions({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();
  // Action en cours : seul son bouton affiche l'attente, l'autre attend la fin.
  const [current, setCurrent] = useState<"archive" | "delete" | null>(null);

  return (
    <div className="flex flex-wrap gap-3">
      <PendingButton
        type="button"
        variant="outline"
        pending={pending && current === "archive"}
        pendingLabel={archived ? "Désarchivage…" : "Archivage…"}
        disabled={pending && current === "delete"}
        onClick={() => {
          setCurrent("archive");
          startTransition(() => {
            void (archived ? unarchiveResource(id) : archiveResource(id));
          });
        }}
      >
        {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        {archived ? "Désarchiver" : "Archiver"}
      </PendingButton>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <PendingButton
            type="button"
            variant="destructive"
            pending={pending && current === "delete"}
            pendingLabel="Suppression…"
            disabled={pending && current === "archive"}
          >
            <Trash2 aria-hidden />
            Supprimer
          </PendingButton>
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
            <AlertDialogAction
              onClick={() => {
                setCurrent("delete");
                startTransition(() => void deleteResource(id));
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
