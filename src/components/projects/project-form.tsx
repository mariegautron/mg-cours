"use client";

import { useActionState } from "react";

import { ActionError } from "@/components/action-error";
import { saveProject } from "@/app/(app)/modules/[id]/project/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="space-y-2">
        <Label htmlFor="title">Titre du projet</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={project?.title ?? ""}
          aria-describedby={fe.title ? "title-error" : undefined}
        />
        <FieldError id="title" errors={fe.title} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="briefMd">Brief (Markdown)</Label>
        <p id="briefMd-hint" className="text-muted-foreground text-sm">
          Objectif général, organisation, attendus : titres (#), listes (-), **gras**.
        </p>
        <Textarea
          id="briefMd"
          name="briefMd"
          rows={10}
          maxLength={20000}
          defaultValue={project?.brief_md ?? ""}
          aria-describedby={fe.briefMd ? "briefMd-hint briefMd-error" : "briefMd-hint"}
        />
        <FieldError id="briefMd" errors={fe.briefMd} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientContextMd">Contexte client (Markdown)</Label>
        <p id="clientContextMd-hint" className="text-muted-foreground text-sm">
          Le client fictif, son besoin, ses contraintes.
        </p>
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
      </div>

      {state.error ? <ActionError error={state.error} /> : null}
      {state.saved ? (
        <p role="status" className="text-sm">
          Projet enregistré.
        </p>
      ) : null}

      <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
        {project ? "Enregistrer le projet" : "Créer le projet"}
      </PendingButton>
    </form>
  );
}
