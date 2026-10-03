"use client";

import { useActionState } from "react";
import { CopyPlus } from "lucide-react";

import { ActionError } from "@/components/action-error";
import { duplicateModule, type DuplicateState } from "@/app/(app)/modules/actions";
import { DeleteModuleDialog } from "@/components/modules/delete-module-dialog";
import { Button } from "@/components/ui/button";
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

      <DeleteModuleDialog id={id} name={name} />
    </div>
  );
}
