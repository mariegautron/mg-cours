"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import type { SettingsFormState } from "@/app/(app)/settings/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/types/db";

type Action = (state: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

function Hint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={`${id}-hint`} className="text-muted-foreground text-sm">
      {children}
    </p>
  );
}

/** Relie l'aide et l'éventuelle erreur d'un champ. */
function describedBy(id: string, hasHint: boolean, errors?: string[]) {
  return (
    [hasHint ? `${id}-hint` : null, errors?.length ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-sm font-semibold">{legend}</legend>
      {children}
    </fieldset>
  );
}

export function SchoolForm({
  title,
  action,
  school,
}: {
  title: string;
  action: Action;
  school?: Tables<"school">;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function leave(e: React.MouseEvent) {
    if (!dirty) return;
    e.preventDefault();
    setLeaving(true);
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/settings"
          onClick={leave}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Réglages
        </Link>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">
          Les champs marqués <span aria-hidden>*</span>
          <span className="sr-only">d’un astérisque</span> sont obligatoires.
        </p>
      </div>

      <form action={formAction} onChange={() => setDirty(true)} className="space-y-8">
        <Group legend="L’école">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom de l’école <span aria-hidden>*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Ex. Nantes Ynov Campus"
              defaultValue={school?.name ?? ""}
              aria-invalid={fe.name ? true : undefined}
              aria-describedby={describedBy("name", false, fe.name)}
            />
            <FieldError id="name" errors={fe.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              name="address"
              rows={3}
              placeholder="Ex. 20 boulevard du Général de Gaulle, 44200 Nantes"
              defaultValue={school?.address ?? ""}
            />
          </div>
        </Group>

        <Group legend="Facturation">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                name="siret"
                inputMode="numeric"
                placeholder="Ex. 804 426 732 00033"
                defaultValue={school?.siret ?? ""}
                aria-invalid={fe.siret ? true : undefined}
                aria-describedby={describedBy("siret", true, fe.siret)}
              />
              <Hint id="siret">14 chiffres, espaces acceptés.</Hint>
              <FieldError id="siret" errors={fe.siret} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paIdentifier">Identifiant Plateforme Agréée (PA)</Label>
              <Input
                id="paIdentifier"
                name="paIdentifier"
                spellCheck={false}
                placeholder="Ex. 804426732_YZ_YNOV_NAN"
                defaultValue={school?.pa_identifier ?? ""}
                aria-describedby="paIdentifier-hint"
              />
              <Hint id="paIdentifier">
                Adresse de dépôt de vos factures électroniques (Factur-X), fournie par l’école.
              </Hint>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingEmail">E-mail de facturation</Label>
            <Input
              id="billingEmail"
              name="billingEmail"
              type="email"
              placeholder="Ex. fournisseurs-nantes@ynov.com"
              defaultValue={school?.billing_email ?? ""}
              aria-invalid={fe.billingEmail ? true : undefined}
              aria-describedby={describedBy("billingEmail", true, fe.billingEmail)}
            />
            <Hint id="billingEmail">Destinataire des factures envoyées par e-mail.</Hint>
            <FieldError id="billingEmail" errors={fe.billingEmail} />
          </div>
        </Group>

        {state.error ? (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending
              ? "Enregistrement…"
              : school
                ? "Enregistrer les modifications"
                : "Créer l’école"}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/settings" onClick={leave}>
              Annuler
            </Link>
          </Button>
        </div>
      </form>

      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vos modifications ne seront pas enregistrées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer la saisie</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDirty(false);
                router.push("/settings");
              }}
            >
              Abandonner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
