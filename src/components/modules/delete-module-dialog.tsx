"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteModule } from "@/app/(app)/modules/actions";
import { ActionError } from "@/components/action-error";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { nameMatches } from "@/lib/modules/delete";

/** Suppression définitive : il faut retaper le nom du module. « Garder » est le premier choix. */
export function DeleteModuleDialog({ id, name }: { id: string; name: string }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ok = nameMatches(typed, name);

  return (
    <AlertDialog onOpenChange={() => (setTyped(""), setError(null))}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          <Trash2 aria-hidden />
          Supprimer le module
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer « {name} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Action définitive : les séances, attendus, évaluations et notes, groupes, projet, liens
            publics et documents de ce module sont supprimés, avec leurs fichiers. Ta bibliothèque
            de ressources et tes étudiant·es ne sont pas touchés. Tu ne pourras pas le récupérer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-module-name">Pour confirmer, retape le nom du module</Label>
          <Input
            id="confirm-module-name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
          {error ? <ActionError error={error} /> : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Garder</AlertDialogCancel>
          <PendingButton
            type="button"
            variant="destructive"
            disabled={!ok}
            pending={pending}
            pendingLabel="Suppression…"
            onClick={() =>
              startTransition(async () => {
                const r = await deleteModule(id, typed);
                if (r?.error) setError(r.error);
              })
            }
          >
            Supprimer définitivement
          </PendingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
