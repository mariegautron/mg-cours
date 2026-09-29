"use client";

import { useState, useTransition } from "react";
import { Dices } from "lucide-react";

import { ActionError } from "@/components/action-error";
import {
  drawGroupThemes,
  setGroupTheme,
  type AssignmentResult,
} from "@/app/(app)/modules/[id]/project/actions";
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
import { Badge } from "@/components/ui/badge";
import { PendingButton } from "@/components/ui/pending-button";
import { Label } from "@/components/ui/label";

const SELECT_CLASS = "border-input h-9 rounded-md border bg-transparent px-3 text-sm";

export interface AssignmentGroup {
  id: string;
  name: string;
  themeId: string;
  method: "volunteer" | "draw" | null;
}

/**
 * US-89 : les volontaires choisissent leur thème (saisi par Marie), puis « Tirer au sort » affecte
 * les autres groupes. Un tirage existant n'est refait qu'après confirmation.
 */
export function ThemeAssignment({
  moduleId,
  themes,
  groups,
  drawSeed,
}: {
  moduleId: string;
  themes: { id: string; title: string }[];
  groups: AssignmentGroup[];
  /** Graine du dernier tirage, affichée pour pouvoir le citer. */
  drawSeed: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AssignmentResult>({});
  const hasDraw = groups.some((g) => g.method === "draw");
  const undecided = groups.filter((g) => !g.themeId).length;
  const toDraw = groups.filter((g) => g.method !== "volunteer").length;

  const choose = (groupId: string, themeId: string) =>
    startTransition(async () => setResult(await setGroupTheme(moduleId, groupId, themeId)));
  const draw = () =>
    startTransition(async () => setResult(await drawGroupThemes(moduleId, hasDraw)));

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucun groupe de projet dans ce module : crée-les dans l’onglet Groupes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {groups.map((g) => (
          <li
            key={g.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{g.name}</span>
              {g.method ? (
                <Badge variant={g.method === "volunteer" ? "secondary" : "outline"}>
                  {g.method === "volunteer" ? "volontaire" : "tirage"}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`theme-of-${g.id}`}>Thème de {g.name}</Label>
              <select
                id={`theme-of-${g.id}`}
                className={SELECT_CLASS}
                value={g.themeId}
                disabled={pending}
                onChange={(e) => choose(g.id, e.target.value)}
              >
                <option value="">Pas encore de thème</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        {hasDraw ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <PendingButton
                type="button"
                variant="secondary"
                pending={pending}
                pendingLabel="Tirage…"
                disabled={themes.length === 0}
              >
                <Dices aria-hidden />
                Refaire le tirage
              </PendingButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Refaire le tirage ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Les thèmes obtenus par tirage seront remplacés par un nouveau tirage. Les groupes
                  volontaires et les thèmes choisis à la main sont conservés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={draw}>Refaire le tirage</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <PendingButton
            type="button"
            variant="secondary"
            pending={pending}
            pendingLabel="Tirage…"
            disabled={themes.length === 0 || toDraw === 0}
            onClick={draw}
          >
            <Dices aria-hidden />
            Tirer au sort les groupes restants ({toDraw})
          </PendingButton>
        )}
        {drawSeed ? (
          <p className="text-muted-foreground text-sm">Dernier tirage : graine {drawSeed}.</p>
        ) : null}
      </div>
      {themes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Ajoute des thèmes pour pouvoir les affecter.
        </p>
      ) : undecided > 0 ? (
        <p className="text-muted-foreground text-sm">
          {undecided} groupe{undecided > 1 ? "s" : ""} sans thème. Les volontaires d’abord, puis le
          tirage pour les autres.
        </p>
      ) : null}

      <div role="status" aria-live="polite">
        {result.message ? <p className="text-sm">{result.message}</p> : null}
      </div>
      {result.error ? <ActionError error={result.error} /> : null}
    </div>
  );
}
