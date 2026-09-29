"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { ActionError } from "@/components/action-error";
import type { ModuleFormState } from "@/app/(app)/modules/actions";
import { FichePrefill } from "@/components/modules/fiche-prefill";
import { ScheduleEditor } from "@/components/modules/schedule-editor";
import { StudentIntroSuggest } from "@/components/modules/student-intro-suggest";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FicheData } from "@/lib/modules/fiche";
import type { Tables } from "@/types/db";
import { keepFormValues } from "@/lib/use-kept-form";

type Action = (state: ModuleFormState, formData: FormData) => Promise<ModuleFormState>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function ModuleForm({
  action,
  schools,
  module: mod,
}: {
  action: Action;
  schools: Pick<Tables<"school">, "id" | "name">[];
  module?: Tables<"module">;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const [fiche, setFiche] = useState<FicheData | null>(null);

  return (
    <>
      <FichePrefill schools={schools} formId="module-form" keepFile={!mod} onRead={setFiche} />
      <form id="module-form" onSubmit={keepFormValues(formAction)} className="max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nom du module</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={mod?.name ?? ""}
              aria-describedby={fe.name ? "name-error" : undefined}
            />
            <FieldError id="name" errors={fe.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="schoolId">École</Label>
            <select
              id="schoolId"
              name="schoolId"
              defaultValue={mod?.school_id ?? ""}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">—</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Niveau</Label>
            <Input id="level" name="level" defaultValue={mod?.level ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Année</Label>
            <Input
              id="year"
              name="year"
              type="number"
              required
              defaultValue={mod?.year ?? new Date().getFullYear()}
              aria-describedby={fe.year ? "year-error" : undefined}
            />
            <FieldError id="year" errors={fe.year} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ycode">YCODE</Label>
            <Input id="ycode" name="ycode" defaultValue={mod?.ycode ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalHours">Nombre d’heures total</Label>
            <Input
              id="totalHours"
              name="totalHours"
              type="number"
              step="0.5"
              required
              defaultValue={mod?.total_hours ?? 0}
              aria-describedby={fe.totalHours ? "totalHours-error" : undefined}
            />
            <FieldError id="totalHours" errors={fe.totalHours} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Tarif horaire HT (€)</Label>
            <Input
              id="hourlyRate"
              name="hourlyRate"
              type="number"
              step="0.01"
              defaultValue={mod?.hourly_rate ?? ""}
            />
            <p className="text-muted-foreground text-sm">Utilisé pour la facture de ce module.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hoursLecture">Heures FFP / cours</Label>
            <Input
              id="hoursLecture"
              name="hoursLecture"
              type="number"
              step="0.5"
              defaultValue={mod?.hours_lecture ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hoursTd">Heures TDP / TD</Label>
            <Input
              id="hoursTd"
              name="hoursTd"
              type="number"
              step="0.5"
              defaultValue={mod?.hours_td ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hoursTp">Heures TP</Label>
            <Input
              id="hoursTp"
              name="hoursTp"
              type="number"
              step="0.5"
              defaultValue={mod?.hours_tp ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstSessionDate">Date de la 1re séance</Label>
            <Input
              id="firstSessionDate"
              name="firstSessionDate"
              type="date"
              defaultValue={mod?.first_session_date ?? ""}
            />
            <p className="text-muted-foreground text-sm">
              Sert à calculer l’échéance d’envoi de la progression pédagogique (J-15).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Date de début</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={mod?.start_date ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Date de fin</Label>
            <Input id="endDate" name="endDate" type="date" defaultValue={mod?.end_date ?? ""} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="purchaseOrderRef">Référence bon de commande</Label>
            <Input
              id="purchaseOrderRef"
              name="purchaseOrderRef"
              defaultValue={mod?.purchase_order_ref ?? ""}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="slidesUrl">Lien des slides (Figma)</Label>
            <Input
              id="slidesUrl"
              name="slidesUrl"
              type="url"
              placeholder="https://www.figma.com/…"
              defaultValue={mod?.slides_url ?? ""}
              aria-describedby={state.fieldErrors?.slidesUrl ? "slidesUrl-error" : undefined}
            />
            {state.fieldErrors?.slidesUrl ? (
              <p id="slidesUrl-error" role="alert" className="text-destructive text-sm">
                {state.fieldErrors.slidesUrl.join(" ")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="studentIntro">Présentation aux étudiant·es</Label>
            <Textarea
              id="studentIntro"
              name="studentIntro"
              rows={6}
              className="font-mono text-sm"
              placeholder={"## Bienvenue !\nCe module vous apprend à…"}
              aria-describedby="studentIntro-hint"
              defaultValue={mod?.student_intro ?? ""}
            />
            <p id="studentIntro-hint" className="text-muted-foreground text-sm">
              Markdown, projeté au début de « Présenter le module » (avant le programme et
              l’évaluation).
            </p>
            <StudentIntroSuggest fiche={fiche} />
          </div>
        </div>

        {state.error ? <ActionError error={state.error} /> : null}

        {mod ? null : (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Planning (facultatif)</legend>
            <p className="text-muted-foreground text-sm">
              Les séances vides sont créées d’un coup, numérotées « Séance 1…N » et à préparer. Tu
              pourras aussi le faire plus tard depuis le module.
            </p>
            <ScheduleEditor />
          </fieldset>
        )}

        <div className="flex gap-3">
          <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
            Enregistrer
          </PendingButton>
          <Button type="button" variant="ghost" asChild>
            <Link href={mod ? `/modules/${mod.id}` : "/modules"}>Annuler</Link>
          </Button>
        </div>
      </form>
    </>
  );
}
