"use client";

import { useActionState } from "react";

import { ActionError } from "@/components/action-error";
import { saveProject } from "@/app/(app)/modules/[id]/project/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BriefEditor } from "@/components/projects/brief-editor";
import { Textarea } from "@/components/ui/textarea";
import { keepFormValues } from "@/lib/use-kept-form";

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

/** US-88 : titre, brief et contexte client (Markdown) du projet fil rouge. */
export function ProjectForm({
  moduleId,
  project,
}: {
  moduleId: string;
  project: { title: string; brief_md: string; client_context_md: string } | null;
}) {
  const [state, formAction, pending] = useActionState(saveProject.bind(null, moduleId), {});
  const fe = state.fieldErrors ?? {};

  return (
    <form onSubmit={keepFormValues(formAction)} className="space-y-5">
      <div className="bg-card rounded-3xl border p-5 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-muted-foreground font-normal">
            Titre du projet
          </Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={project?.title ?? ""}
            aria-describedby={fe.title ? "title-error" : undefined}
          />
          <FieldError id="title" errors={fe.title} />
        </div>
      </div>

      <BriefEditor initial={project?.brief_md ?? ""} error={fe.briefMd} />

      <section aria-labelledby="client-card" className="bg-card rounded-3xl border p-5 shadow-sm">
        <h2 id="client-card" className="font-heading mb-1 text-xl font-bold">
          Le client et le contexte
        </h2>
        <p id="clientContextMd-hint" className="text-muted-foreground mb-3 text-sm">
          Le client fictif, son besoin, ses contraintes. Propre à ce projet : à réécrire quand tu
          pars d’un autre.
        </p>
        <Label htmlFor="clientContextMd" className="sr-only">
          Contexte client (Markdown)
        </Label>
        <Textarea
          id="clientContextMd"
          name="clientContextMd"
          rows={6}
          maxLength={20000}
          defaultValue={project?.client_context_md ?? ""}
          aria-describedby={
            fe.clientContextMd
              ? "clientContextMd-hint clientContextMd-error"
              : "clientContextMd-hint"
          }
        />
        <FieldError id="clientContextMd" errors={fe.clientContextMd} />
      </section>

      {state.error ? <ActionError error={state.error} /> : null}
      <div className="bg-background/95 flex flex-wrap items-center gap-3 rounded-2xl border p-3 backdrop-blur md:sticky md:bottom-2">
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          {project ? "Enregistrer le projet" : "Créer le projet"}
        </PendingButton>
        {state.saved ? (
          <p role="status" className="text-sm">
            Projet enregistré.
          </p>
        ) : null}
      </div>
    </form>
  );
}
