"use client";

import { useActionState, useTransition } from "react";
import { CopyPlus, Trash2 } from "lucide-react";

import { ActionError } from "@/components/action-error";
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
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ExperienceNote {
  number: number;
  title: string;
  text: string;
}

export interface AssessmentExperienceNote {
  title: string;
  text: string;
}

export function ModuleDangerZone({
  id,
  year,
  experience = [],
  assessmentExperience = [],
}: {
  id: string;
  year: number;
  /** Retours d'expérience privés des séances, à relire avant de dupliquer (US-68). */
  experience?: ExperienceNote[];
  /** Retours d'expérience privés des évaluations, à relire avant de dupliquer (US-98). */
  assessmentExperience?: AssessmentExperienceNote[];
}) {
  const [pending, startTransition] = useTransition();
  const [dupState, dupAction, dupPending] = useActionState(
    duplicateModule.bind(null, id),
    {} as DuplicateState,
  );

  return (
    <div className="space-y-6">
      {experience.length || assessmentExperience.length ? (
        <section aria-labelledby="experience" className="space-y-2 rounded-lg border p-4">
          <h3 id="experience" className="font-medium">
            Retour d’expérience de cette année
          </h3>
          <p className="text-muted-foreground text-sm">
            Notes privées prises à la clôture des séances et sur les évaluations : à relire avant de
            reprendre le module. Elles ne sont pas copiées dans la nouvelle année.
          </p>
          <ul className="space-y-2 text-sm">
            {experience.map((n) => (
              <li key={n.number}>
                <p className="font-medium">
                  Séance {n.number} : {n.title}
                </p>
                <p className="whitespace-pre-wrap">{n.text}</p>
              </li>
            ))}
            {assessmentExperience.map((n, i) => (
              <li key={`${i}-${n.title}`}>
                <p className="font-medium">Évaluation : {n.title}</p>
                <p className="whitespace-pre-wrap">{n.text}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <form action={dupAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="year">Dupliquer pour l’année</Label>
          <Input id="year" name="year" type="number" defaultValue={year + 1} className="w-28" />
        </div>
        <Button type="submit" variant="secondary" disabled={dupPending}>
          <CopyPlus aria-hidden />
          {dupPending ? "Duplication…" : "Dupliquer le module"}
        </Button>
        {dupState.error ? <ActionError error={dupState.error} /> : null}
      </form>
      <p className="text-muted-foreground text-sm">
        Copie le module (métadonnées, cours et ressources liées, projet, thèmes, évaluations avec
        leur sujet, leurs fichiers, leur grille et leur coefficient) vers une nouvelle année. Ni
        notes, ni dates, ni groupes : ils repartent à zéro. Tes grilles et tes phrases réutilisables
        sont à toi, elles servent telles quelles.
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <PendingButton
            type="button"
            variant="destructive"
            pending={pending}
            pendingLabel="Suppression…"
          >
            <Trash2 aria-hidden />
            Supprimer le module
          </PendingButton>
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
