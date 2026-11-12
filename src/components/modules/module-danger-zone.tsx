"use client";

import { useActionState, useRef, useState } from "react";
import { CopyPlus } from "lucide-react";

import { ActionError } from "@/components/action-error";
import { duplicateModule, type DuplicateState } from "@/app/(app)/modules/actions";
import { DeleteModuleDialog } from "@/components/modules/delete-module-dialog";
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
import { PrivateZone } from "@/components/ui/private-zone";
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
  name,
  year,
  experience = [],
  assessmentExperience = [],
}: {
  id: string;
  name: string;
  year: number;
  /** Retours d'expérience privés des séances, à relire avant de dupliquer (US-68). */
  experience?: ExperienceNote[];
  /** Retours d'expérience privés des évaluations, à relire avant de dupliquer (US-98). */
  assessmentExperience?: AssessmentExperienceNote[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [copyName, setCopyName] = useState(`${name} (${year + 1})`);
  const [copyYear, setCopyYear] = useState(String(year + 1));
  const [dupState, dupAction, dupPending] = useActionState(
    duplicateModule.bind(null, id),
    {} as DuplicateState,
  );

  return (
    <div className="space-y-6">
      {experience.length || assessmentExperience.length ? (
        <PrivateZone titleId="experience" title="Retour d’expérience de cette année">
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
        </PrivateZone>
      ) : null}
      <form ref={formRef} action={dupAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="dup-name">Nom de la copie</Label>
          <Input
            id="dup-name"
            name="name"
            value={copyName}
            onChange={(e) => setCopyName(e.target.value)}
            maxLength={200}
            className="w-72 max-w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Pour l’année</Label>
          <Input
            id="year"
            name="year"
            type="number"
            value={copyYear}
            onChange={(e) => setCopyYear(e.target.value)}
            className="w-28"
          />
        </div>
        {/* Confirmation dans l'appli : elle nomme la copie et ce qui part (ou pas) avec. */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="secondary" disabled={dupPending}>
              <CopyPlus aria-hidden />
              {dupPending ? "Duplication…" : "Dupliquer le module"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Dupliquer « {name} » ?</AlertDialogTitle>
              <AlertDialogDescription>
                Un nouveau module « {copyName.trim() || name} » ({copyYear}) est créé avec les
                séances, les ressources, le projet et les évaluations. Ni notes, ni dates, ni
                groupes. Le module actuel ne change pas.
                {copyName.trim() === name
                  ? " Attention : la copie porte le même nom que l’original."
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>
                Dupliquer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {dupState.error ? <ActionError error={dupState.error} /> : null}
      </form>
      <p className="text-muted-foreground text-sm">
        Copie le module (métadonnées, cours et ressources liées, projet, thèmes, évaluations avec
        leur sujet, leurs fichiers, leur grille et leur coefficient) vers une nouvelle année. Ni
        notes, ni dates, ni groupes : ils repartent à zéro. Tes grilles et tes phrases réutilisables
        sont à toi, elles servent telles quelles.
      </p>

      <DeleteModuleDialog id={id} name={name} />
    </div>
  );
}
