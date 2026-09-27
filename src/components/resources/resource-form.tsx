"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import type { ResourceFormState } from "@/app/(app)/resources/actions";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolveImageSrc } from "@/lib/resources/files";
import {
  AUDIENCE_LABELS,
  KIND_LABELS,
  RESOURCE_KINDS,
  TEACHER_KINDS,
  type ResourceAudience,
} from "@/lib/resources/kind";
import { cn } from "@/lib/utils";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-guard";
import type { Tables } from "@/types/db";

type Action = (state: ResourceFormState, formData: FormData) => Promise<ResourceFormState>;

const SELECT_CLASS =
  "border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm aria-invalid:border-destructive";

const AUDIENCE_HINTS: Record<ResourceAudience, string> = {
  students: "Peut être projetée et incluse dans les documents remis aux étudiant·es.",
  teacher:
    "Jamais projetée ni diffusée (présentation, export PDF, liens) : corrigés, notes, banque de questions.",
};

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function ResourceForm({
  action,
  resource,
  subjects,
}: {
  action: Action;
  resource?: Tables<"resource">;
  /** Matières proposées dans le champ « Matière » (déjà utilisées + liste guidée). */
  subjects: string[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const [audience, setAudience] = useState<ResourceAudience>(resource?.audience ?? "students");
  const [audienceTouched, setAudienceTouched] = useState(!!resource);
  const [content, setContent] = useState(resource?.content ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty && !pending);

  function onKindChange(kind: string) {
    // Un corrigé, une banque de questions ou des notes sont réservés à l'enseignante par défaut.
    if (!audienceTouched) {
      setAudience((TEACHER_KINDS as readonly string[]).includes(kind) ? "teacher" : "students");
    }
  }

  return (
    <form action={formAction} onChange={() => setDirty(true)} className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={resource?.title ?? ""}
          aria-invalid={fe.title ? true : undefined}
          aria-describedby={fe.title ? "title-error" : undefined}
        />
        <FieldError id="title" errors={fe.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kind">
            Type <span aria-hidden>*</span>
          </Label>
          <select
            id="kind"
            name="kind"
            required
            defaultValue={resource?.kind ?? ""}
            onChange={(e) => onKindChange(e.target.value)}
            aria-invalid={fe.kind ? true : undefined}
            aria-describedby={fe.kind ? "kind-error" : undefined}
            className={SELECT_CLASS}
          >
            <option value="" disabled>
              Choisir un type…
            </option>
            {RESOURCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </select>
          <FieldError id="kind" errors={fe.kind} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Matière</Label>
          <Input
            id="category"
            name="category"
            list="subject-suggestions"
            autoComplete="off"
            placeholder="Ex. Gestion de projet"
            aria-describedby="category-hint"
            defaultValue={resource?.category ?? ""}
          />
          <datalist id="subject-suggestions">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p id="category-hint" className="text-muted-foreground text-sm">
            Choisissez une matière proposée ou saisissez-en une nouvelle.
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Visibilité</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["students", "teacher"] as const).map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm",
                "has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2",
                audience === value && "border-primary bg-primary/5",
              )}
            >
              <input
                type="radio"
                name="audience"
                value={value}
                checked={audience === value}
                onChange={() => {
                  setAudience(value);
                  setAudienceTouched(true);
                }}
                aria-describedby={`audience-${value}-hint`}
                className="accent-primary mt-0.5"
              />
              <span>
                <span className="font-medium">{AUDIENCE_LABELS[value]}</span>
                <span id={`audience-${value}-hint`} className="text-muted-foreground block">
                  {AUDIENCE_HINTS[value]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={resource?.description ?? ""}
        />
        <FieldError id="description" errors={fe.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="url">Lien</Label>
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://…"
            defaultValue={resource?.url ?? ""}
            aria-invalid={fe.url ? true : undefined}
            aria-describedby={fe.url ? "url-error" : undefined}
          />
          <FieldError id="url" errors={fe.url} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            placeholder="RGAA, RACI, SantaConnect"
            aria-describedby="tags-hint"
            defaultValue={(resource?.tags ?? []).join(", ")}
          />
          <p id="tags-hint" className="text-muted-foreground text-sm">
            Notions ou projet, séparés par des virgules.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label htmlFor="content">Contenu (Markdown)</Label>
          <div
            role="tablist"
            aria-label="Écrire ou prévisualiser"
            className="bg-muted flex rounded-md p-0.5"
          >
            {(
              [
                ["write", "Écrire"],
                ["preview", "Aperçu"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`tab-${value}`}
                aria-selected={tab === value}
                aria-controls={`panel-${value}`}
                onClick={() => setTab(value)}
                className={cn(
                  "focus-visible:ring-ring rounded px-3 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none",
                  tab === value ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div id="panel-write" role="tabpanel" aria-labelledby="tab-write" hidden={tab !== "write"}>
          <Textarea
            id="content"
            name="content"
            rows={18}
            className="font-mono text-sm"
            aria-describedby="content-hint"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p id="content-hint" className="text-muted-foreground mt-2 text-sm">
            Titres <code>##</code> ou séparateur <code>---</code> = nouvelle diapositive en mode
            présentation. Image déposée sur la ressource : <code>![description](fichier.png)</code>.
          </p>
        </div>
        <div
          id="panel-preview"
          role="tabpanel"
          aria-labelledby="tab-preview"
          tabIndex={0}
          hidden={tab !== "preview"}
          className="bg-card min-h-40 rounded-md border p-4"
        >
          {tab !== "preview" ? null : content.trim() ? (
            <Markdown
              source={content}
              resolveImageSrc={resource ? (src) => resolveImageSrc(resource.id, src) : undefined}
            />
          ) : (
            <p className="text-muted-foreground text-sm">Rien à afficher pour l’instant.</p>
          )}
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <div className="bg-background/95 sticky bottom-0 -mx-1 flex gap-3 border-t px-1 py-3 backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={resource ? `/resources/${resource.id}` : "/resources"}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
