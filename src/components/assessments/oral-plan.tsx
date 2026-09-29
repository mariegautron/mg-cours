"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Dices } from "lucide-react";

import { ActionError } from "@/components/action-error";
import {
  buildOralOrder,
  moveOralSlot,
  saveOralSettings,
  setSlotDuration,
  type OralState,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/oral/actions";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PlanSlot {
  id: string;
  groupId: string;
  groupName: string;
  method: "volunteer" | "draw";
  /** Durée propre au créneau, `null` : durée de l'évaluation. */
  durationMinutes: number | null;
  /** Durée effective (créneau, évaluation ou défaut). */
  effectiveMinutes: number;
  start: string | null;
  end: string | null;
  status: "waiting" | "done";
}

/**
 * US-92 : ordre de passage (volontaires d'abord, puis tirage reproductible), heure de début, durée
 * globale et durée par créneau. Refaire un ordre existant demande confirmation.
 */
export function OralPlan({
  moduleId,
  assessmentId,
  groups,
  slots,
  startTime,
  durationMinutes,
  orderSeed,
}: {
  moduleId: string;
  assessmentId: string;
  groups: { id: string; name: string }[];
  slots: PlanSlot[];
  startTime: string | null;
  durationMinutes: number | null;
  orderSeed: string | null;
}) {
  const hasOrder = slots.length > 0;
  const [orderState, orderAction, orderPending] = useActionState(
    buildOralOrder.bind(null, moduleId, assessmentId),
    {},
  );
  const [settingsState, settingsAction, settingsPending] = useActionState(
    saveOralSettings.bind(null, moduleId, assessmentId),
    {},
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<OralState>({});
  const [submitted, setSubmitted] = useState(false);
  const missing = groups.filter((g) => !slots.some((s) => s.groupId === g.id));

  function confirmRebuild() {
    const form = document.getElementById("oral-order-form") as HTMLFormElement | null;
    const flag = form?.elements.namedItem("confirm") as HTMLInputElement | null;
    if (!form || !flag) return;
    flag.value = "1";
    form.requestSubmit();
    flag.value = "0";
  }

  const run = (fn: () => Promise<OralState>) => startTransition(async () => setResult(await fn()));

  const orderForm = (
    <form
      id="oral-order-form"
      action={orderAction}
      onSubmit={() => setSubmitted(true)}
      className="space-y-3"
    >
      {/* Posé à « 1 » uniquement par le dialogue de confirmation quand un ordre existe déjà. */}
      <input type="hidden" name="confirm" defaultValue="0" />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Groupes volontaires</legend>
        <p className="text-muted-foreground text-sm">
          Donne un rang (1, 2, 3…) aux groupes qui veulent passer en premier ; les autres passent
          dans un ordre tiré au sort.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {groups.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2"
            >
              <Label htmlFor={`rank-${g.id}`}>Rang de {g.name}</Label>
              <Input
                id={`rank-${g.id}`}
                name={`rank-${g.id}`}
                type="number"
                min={1}
                className="w-20"
                placeholder="tirage"
              />
            </li>
          ))}
        </ul>
      </fieldset>
    </form>
  );

  return (
    <div className="space-y-6">
      {hasOrder ? (
        <>
          <ol className="space-y-2">
            {slots.map((s, i) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {i + 1}. {s.groupName}
                  </span>
                  <Badge variant={s.method === "volunteer" ? "secondary" : "outline"}>
                    {s.method === "volunteer" ? "volontaire" : "tirage"}
                  </Badge>
                  {s.status === "done" ? <Badge>passé</Badge> : null}
                  <span className="text-muted-foreground text-sm">
                    {s.start && s.end ? `${s.start}–${s.end} · ` : ""}
                    {s.effectiveMinutes} min
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor={`slot-duration-${s.id}`} className="text-sm">
                    Durée de {s.groupName} (min)
                  </Label>
                  <Input
                    id={`slot-duration-${s.id}`}
                    type="number"
                    min={1}
                    max={240}
                    className="w-20"
                    defaultValue={s.durationMinutes ?? ""}
                    placeholder={String(durationMinutes ?? s.effectiveMinutes)}
                    onBlur={(e) => {
                      const raw = e.currentTarget.value.trim();
                      const next = raw ? Number(raw) : null;
                      if (next === s.durationMinutes) return;
                      run(() => setSlotDuration(moduleId, assessmentId, s.id, next));
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={pending || i === 0}
                    aria-label={`Monter ${s.groupName} (passage ${i + 1})`}
                    onClick={() => run(() => moveOralSlot(moduleId, assessmentId, s.id, -1))}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={pending || i === slots.length - 1}
                    aria-label={`Descendre ${s.groupName} (passage ${i + 1})`}
                    onClick={() => run(() => moveOralSlot(moduleId, assessmentId, s.id, 1))}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          {missing.length > 0 ? (
            <p role="status" className="text-sm">
              {missing.map((g) => g.name).join(", ")} : sans créneau. Refais l’ordre pour les
              ajouter.
            </p>
          ) : null}
          {orderSeed ? (
            <p className="text-muted-foreground text-sm">Dernier tirage : graine {orderSeed}.</p>
          ) : null}

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer font-medium">Refaire l’ordre de passage</summary>
            <div className="mt-3 space-y-3">
              {orderForm}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="secondary" disabled={orderPending}>
                    <Dices aria-hidden />
                    Refaire l’ordre
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Refaire l’ordre de passage ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      L’ordre actuel, les durées propres à chaque créneau et les groupes marqués «
                      passé » seront remplacés. Les notes déjà saisies sont conservées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmRebuild}>Refaire l’ordre</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </details>
        </>
      ) : (
        <div className="space-y-3">
          {orderForm}
          <Button type="submit" form="oral-order-form" disabled={orderPending}>
            <Dices aria-hidden />
            Établir l’ordre de passage
          </Button>
        </div>
      )}

      {submitted && orderState.error ? <ActionError error={orderState.error} /> : null}
      {orderState.message ? (
        <p role="status" className="text-sm">
          {orderState.message}
        </p>
      ) : null}

      <form action={settingsAction} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="oral-start">Heure de début</Label>
          <Input id="oral-start" name="startTime" type="time" defaultValue={startTime ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="oral-duration">Durée par groupe (min)</Label>
          <Input
            id="oral-duration"
            name="durationMinutes"
            type="number"
            min={1}
            max={240}
            className="w-28"
            defaultValue={durationMinutes ?? ""}
            placeholder="15"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={settingsPending}>
          Enregistrer les horaires
        </Button>
      </form>
      {settingsState.error ? <ActionError error={settingsState.error} /> : null}
      {settingsState.message ? (
        <p role="status" className="text-sm">
          {settingsState.message}
        </p>
      ) : null}

      <div role="status" aria-live="polite">
        {result.message ? <p className="text-sm">{result.message}</p> : null}
      </div>
      {result.error ? <ActionError error={result.error} /> : null}
    </div>
  );
}
