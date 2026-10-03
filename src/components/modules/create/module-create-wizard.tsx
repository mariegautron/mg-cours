"use client";

import { useActionState, useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ActionError } from "@/components/action-error";
import type { ModuleFormState } from "@/app/(app)/modules/actions";
import { FicheCard } from "@/components/modules/create/fiche-card";
import { setField } from "@/components/modules/create/form-fields";
import {
  HyperplanningCard,
  type HyperplanningRead,
} from "@/components/modules/create/hyperplanning-card";
import { PlanningStep } from "@/components/modules/create/planning-step";
import { StudentIntroSuggest } from "@/components/modules/student-intro-suggest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import { createButtonLabel, mergePlanned } from "@/lib/modules/create-wizard";
import type { FicheData } from "@/lib/modules/fiche";
import {
  matchServices,
  moduleDatesFromSlots,
  slotsToSessions,
  type SlotMode,
} from "@/lib/modules/hyperplanning";
import type { ScheduleRow } from "@/lib/modules/schedule-parser";
import type { Tables } from "@/types/db";
import { keepFormValues } from "@/lib/use-kept-form";

type Action = (state: ModuleFormState, formData: FormData) => Promise<ModuleFormState>;

const FIELD_LABELS: Record<string, string> = {
  name: "le nom",
  year: "l’année",
  totalHours: "le nombre d’heures",
  slidesUrl: "le lien des slides",
};

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

function Row({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-center gap-1.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-3">
      <Label htmlFor={htmlFor} className="text-muted-foreground font-normal">
        {label}
      </Label>
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  );
}

const SELECT = "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm";

/**
 * Créer le module en deux étapes (maquettes « Créer le module ») : 1. les documents de l'école
 * (fiche pédagogique, export Hyperplanning) et ce qui en est compris, 2. planning et dates.
 * Un seul formulaire : les deux étapes restent montées, l'étape cachée garde ses champs.
 */
export function ModuleCreateWizard({
  action,
  schools,
}: {
  action: Action;
  schools: Pick<Tables<"school">, "id" | "name">[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [fiche, setFiche] = useState<FicheData | null>(null);
  const [read, setRead] = useState<HyperplanningRead | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [mode, setMode] = useState<SlotMode>("merge");
  const [manual, setManual] = useState<ScheduleRow[]>([]);
  const [moduleHours, setModuleHours] = useState(0);

  const service = read && chosen !== null ? read.services[chosen] : null;
  const imported = useMemo(
    () => (service ? slotsToSessions(service.slots, mode) : []),
    [service, mode],
  );
  const sessions = useMemo(() => mergePlanned(imported, manual), [imported, manual]);
  const derived = useMemo(
    () => moduleDatesFromSlots(sessions.map((s) => ({ date: s.date }))),
    [sessions],
  );

  function getName() {
    return (formRef.current?.elements.namedItem("name") as HTMLInputElement | null)?.value ?? "";
  }

  const onManualRows = useCallback((rows: ScheduleRow[]) => setManual(rows), []);

  const choose = (index: number, from: HyperplanningRead) => {
    setChosen(index);
    const s = from.services[index];
    // Nom, promotion et heures ne remplacent jamais ce que la fiche ou Marie a déjà écrit.
    setField("name", s.name, true);
    setField("level", s.audience.split("|").pop()?.trim() ?? "", true);
    if (s.totalHours) setField("totalHours", String(s.totalHours), true);
  };

  const goTo = (next: 1 | 2) => {
    setStep(next);
    setTimeout(() => {
      titleRef.current?.focus();
      window.scrollTo({ top: 0 });
    }, 0);
  };

  const continueToPlanning = () => {
    const form = formRef.current;
    if (form) {
      for (const field of ["name", "year", "totalHours"]) {
        const el = form.elements.namedItem(field) as HTMLInputElement | null;
        if (el && !el.checkValidity()) {
          el.reportValidity();
          return;
        }
      }
    }
    goTo(2);
  };

  const hasFieldErrors = Object.keys(fe).length > 0;

  return (
    <form
      id="module-form"
      ref={formRef}
      onSubmit={keepFormValues(formAction)}
      onInput={(e) => {
        const target = e.target as HTMLInputElement;
        if (target.name === "totalHours") setModuleHours(Number(target.value) || 0);
      }}
      className="space-y-5"
    >
      <input type="hidden" name="scheduleJson" value={JSON.stringify(sessions)} />

      <div>
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="font-heading text-3xl font-bold tracking-tight outline-none"
        >
          {step === 1 ? "Nouveau module" : "Planning et dates"}
        </h1>
        <p className="text-muted-foreground mt-1.5">
          {step === 1
            ? "Dépose les documents de l’école : je m’occupe de remplir le reste. Tu pourras tout corriger ensuite."
            : "Voilà les séances que j’ai déduites de l’export de l’école. Rien n’est créé avant ton accord."}
        </p>
      </div>

      <ol aria-label="Étapes de la création" className="flex flex-wrap items-center gap-3.5">
        {(
          [
            [1, "Les documents de l’école"],
            [2, "Planning et dates"],
          ] as const
        ).map(([n, label], i) => {
          const done = n < step;
          const current = n === step;
          return (
            <li key={n} className="flex items-center gap-3.5">
              {i > 0 ? (
                <span
                  aria-hidden
                  className={`h-0.5 w-10 ${done || current ? "bg-mint/60" : "bg-border"}`}
                />
              ) : null}
              <span
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-2.5 font-semibold ${current ? "" : "text-muted-foreground"}`}
              >
                <span
                  aria-hidden
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                    done
                      ? "bg-mint text-background"
                      : current
                        ? "bg-primary text-primary-foreground"
                        : "border"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                {label}
                {done ? <span className="sr-only"> (terminée)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>

      <div hidden={step !== 1}>
        <div className="flex flex-wrap items-start gap-6 lg:flex-nowrap">
          <div className="min-w-0 flex-1 basis-full space-y-4 lg:basis-0">
            <FicheCard schools={schools} onRead={setFiche} />
            <HyperplanningCard
              read={read}
              chosen={chosen}
              onRead={(r) => {
                setRead(r);
                const found = matchServices(r.services, getName());
                if (found.length === 1) choose(r.services.indexOf(found[0]), r);
                else setChosen(null);
              }}
              onChoose={(i) => read && choose(i, read)}
              onReset={() => {
                setRead(null);
                setChosen(null);
              }}
              getModuleName={getName}
            />
          </div>

          <aside
            aria-labelledby="compris"
            className="bg-card w-full min-w-0 space-y-3 rounded-3xl border p-5 shadow-sm lg:w-[28rem] lg:flex-none"
          >
            <h2 id="compris" className="font-heading text-xl font-bold">
              Ce que j’ai compris
            </h2>
            <Row label="Nom du module" htmlFor="name">
              <Input
                id="name"
                name="name"
                required
                aria-describedby={fe.name ? "name-error" : undefined}
              />
              <FieldError id="name" errors={fe.name} />
            </Row>
            <Row label="YCODE" htmlFor="ycode">
              <Input id="ycode" name="ycode" />
            </Row>
            <Row label="École" htmlFor="schoolId">
              <select id="schoolId" name="schoolId" defaultValue="" className={SELECT}>
                <option value="">—</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Niveau" htmlFor="level">
              <Input id="level" name="level" />
            </Row>
            <Row label="Année" htmlFor="year">
              <Input
                id="year"
                name="year"
                type="number"
                required
                defaultValue={new Date().getFullYear()}
                aria-describedby={fe.year ? "year-error" : undefined}
              />
              <FieldError id="year" errors={fe.year} />
            </Row>
            <Row label="Nombre d’heures total" htmlFor="totalHours">
              <Input
                id="totalHours"
                name="totalHours"
                type="number"
                step="0.5"
                required
                defaultValue={0}
                aria-describedby={fe.totalHours ? "totalHours-error" : undefined}
              />
              <FieldError id="totalHours" errors={fe.totalHours} />
            </Row>
            <p className="text-muted-foreground border-t pt-3.5 text-sm">
              Un champ te semble faux ? Corrige-le ici, à l’étape suivante ou dans la fiche du
              module.
            </p>

            <details className="border-t pt-3.5">
              <summary className="cursor-pointer text-sm font-semibold">
                Autres informations (facultatif)
              </summary>
              <div className="mt-3 space-y-3">
                <Row label="Tarif horaire HT (€)" htmlFor="hourlyRate">
                  <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" />
                </Row>
                <Row label="Heures FFP / cours" htmlFor="hoursLecture">
                  <Input id="hoursLecture" name="hoursLecture" type="number" step="0.5" />
                </Row>
                <Row label="Heures TDP / TD" htmlFor="hoursTd">
                  <Input id="hoursTd" name="hoursTd" type="number" step="0.5" />
                </Row>
                <Row label="Heures TP" htmlFor="hoursTp">
                  <Input id="hoursTp" name="hoursTp" type="number" step="0.5" />
                </Row>
                <Row label="Référence bon de commande" htmlFor="purchaseOrderRef">
                  <Input id="purchaseOrderRef" name="purchaseOrderRef" />
                </Row>
                <Row label="Lien des slides (Figma)" htmlFor="slidesUrl">
                  <Input
                    id="slidesUrl"
                    name="slidesUrl"
                    type="url"
                    placeholder="https://www.figma.com/…"
                    aria-describedby={fe.slidesUrl ? "slidesUrl-error" : undefined}
                  />
                  <FieldError id="slidesUrl" errors={fe.slidesUrl} />
                </Row>
                <div className="space-y-2">
                  <Label htmlFor="studentIntro">Présentation aux étudiant·es</Label>
                  <Textarea
                    id="studentIntro"
                    name="studentIntro"
                    rows={5}
                    className="font-mono text-sm"
                    placeholder={"## Bienvenue !\nCe module vous apprend à…"}
                    aria-describedby="studentIntro-hint"
                  />
                  <p id="studentIntro-hint" className="text-muted-foreground text-sm">
                    Markdown, projeté au début de « Présenter le module ».
                  </p>
                  <StudentIntroSuggest fiche={fiche} />
                </div>
              </div>
            </details>
          </aside>
        </div>
      </div>

      <div hidden={step !== 2}>
        <PlanningStep
          sessions={sessions}
          slots={service?.slots ?? []}
          hasImport={!!service}
          mode={mode}
          onMode={setMode}
          moduleHours={moduleHours}
          derived={derived}
          onManualRows={onManualRows}
        />
      </div>

      {state.error ? <ActionError error={state.error} /> : null}
      {hasFieldErrors && step === 2 ? (
        <p role="alert" className="text-destructive text-sm">
          Certains champs de l’étape 1 sont à corriger (
          {Object.keys(fe)
            .map((k) => FIELD_LABELS[k] ?? k)
            .join(", ")}
          ).{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => goTo(1)}>
            Revenir à l’étape 1
          </button>
        </p>
      ) : null}

      <div className="bg-background/95 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 backdrop-blur md:sticky md:bottom-2">
        {step === 1 ? (
          <Button type="button" variant="ghost" asChild>
            <Link href="/modules">Annuler</Link>
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={() => goTo(1)}>
            ← Retour
          </Button>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-sm">Étape {step} sur 2</span>
          {step === 1 ? (
            <>
              <PendingButton
                type="submit"
                variant="outline"
                pending={pending}
                pendingLabel="Enregistrement…"
              >
                Enregistrer sans planning
              </PendingButton>
              <Button type="button" onClick={continueToPlanning}>
                Continuer : planning et dates
                <ChevronRight aria-hidden />
              </Button>
            </>
          ) : (
            <PendingButton type="submit" pending={pending} pendingLabel="Création…">
              {createButtonLabel(sessions.length)}
            </PendingButton>
          )}
        </div>
      </div>
    </form>
  );
}
