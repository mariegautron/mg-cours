"use client";

import { useActionState, useTransition } from "react";
import { CopyPlus, Trash2 } from "lucide-react";

import { deleteModule, duplicateModule, type DuplicateState } from "@/app/(app)/modules/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ModuleDangerZone({ id, year }: { id: string; year: number }) {
  const [pending, startTransition] = useTransition();
  const [dupState, dupAction, dupPending] = useActionState(
    duplicateModule.bind(null, id),
    {} as DuplicateState,
  );

  return (
    <div className="space-y-6">
      <form action={dupAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="year">Dupliquer pour l’année</Label>
          <Input id="year" name="year" type="number" defaultValue={year + 1} className="w-28" />
        </div>
        <Button type="submit" variant="secondary" disabled={dupPending}>
          <CopyPlus aria-hidden />
          {dupPending ? "Duplication…" : "Dupliquer le module"}
        </Button>
        {dupState.error ? (
          <p role="alert" className="text-destructive text-sm">
            {dupState.error}
          </p>
        ) : null}
      </form>
      <p className="text-muted-foreground text-sm">
        Copie le module (métadonnées, cours et ressources liées) vers une nouvelle année ; les dates
        et le statut repartent à zéro.
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={pending}>
            <Trash2 aria-hidden />
            Supprimer le module
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce module ?</AlertDialogTitle>
            <AlertDialogDescription>
              Action définitive. Les cours, groupes et évaluations liés seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => startTransition(() => void deleteModule(id))}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
