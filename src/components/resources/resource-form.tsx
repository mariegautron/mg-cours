"use client";

import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { ActionError } from "@/components/action-error";
import type { ResourceFormState } from "@/app/(app)/resources/actions";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolveImageSrc } from "@/lib/resources/files";
import { cleanPaste, insertAtSelection, slidePreviews } from "@/lib/resources/paste";
import {
  AUDIENCE_LABELS,
  KIND_LABELS,
  RESOURCE_KINDS,
  STATUS_LABELS,
  RESOURCE_STATUSES,
  TEACHER_KINDS,
  type ResourceAudience,
} from "@/lib/resources/kind";
import { cn } from "@/lib/utils";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-guard";
import type { Tables } from "@/types/db";
import { keepFormValues } from "@/lib/use-kept-form";

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

  // Brouillon gardé sur cet appareil (US-152) : pas de version de plus dans l'historique de la ressource.
  const draftKey = `mg-resource-draft:${resource?.id ?? "new"}`;
  const [title, setTitle] = useState(resource?.title ?? "");
  const [draftNote, setDraftNote] = useState("");
  const [restorable, setRestorable] = useState<{ title: string; content: string } | null>(null);
  const [pasteNote, setPasteNote] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const deferredContent = useDeferredValue(content);
  const slides = useMemo(() => slidePreviews(deferredContent), [deferredContent]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as { title?: string; content?: string };
      const saved = { title: d.title ?? "", content: d.content ?? "" };
      if (saved.content !== (resource?.content ?? "") || saved.title !== (resource?.title ?? "")) {
        /* eslint-disable-next-line react-hooks/set-state-in-effect -- brouillon local lu après hydratation */
        if (saved.content.trim() || saved.title.trim()) setRestorable(saved);
      }
    } catch {
      /* stockage indisponible : pas de brouillon */
    }
  }, [draftKey, resource?.content, resource?.title]);

  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, content }));
        setDraftNote(
          `Brouillon enregistré sur cet appareil à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`,
        );
      } catch {
        setDraftNote("Enregistrement automatique indisponible : pense à enregistrer.");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [dirty, title, content, draftKey]);

  // Une erreur au serveur : le brouillon est remis (il est effacé à l'envoi).
  useEffect(() => {
    if (state.error || state.fieldErrors) {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, content }));
      } catch {
        /* sans effet */
      }
    }
  }, [state, draftKey, title, content]);

  function onPasteContent(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    const cleaned = cleanPaste(text);
    if (cleaned === text) return; // rien à nettoyer : collage normal
    e.preventDefault();
    const el = e.currentTarget;
    const next = insertAtSelection(content, el.selectionStart, el.selectionEnd, cleaned);
    setContent(next.text);
    setDirty(true);
    setPasteNote("Collage nettoyé : puces, espaces et sauts de ligne remis en forme.");
    requestAnimationFrame(() => el.setSelectionRange(next.cursor, next.cursor));
  }

  function cleanAll() {
    const cleaned = cleanPaste(content);
    setPasteNote(
      cleaned === content
        ? "Rien à nettoyer."
        : "Texte nettoyé : puces, espaces et sauts de ligne remis en forme.",
    );
    if (cleaned !== content) {
      setContent(cleaned);
      setDirty(true);
    }
  }

  function onKindChange(kind: string) {
    // Un corrigé, une banque de questions ou des notes sont réservés à l'enseignante par défaut.
    if (!audienceTouched) {
      setAudience((TEACHER_KINDS as readonly string[]).includes(kind) ? "teacher" : "students");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          /* sans effet */
        }
        keepFormValues(formAction)(e);
      }}
      onChange={() => setDirty(true)}
      className="max-w-6xl space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={resource?.title ?? ""}
          onChange={(e) => setTitle(e.target.value)}
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
            Choisis une matière proposée ou saisis-en une nouvelle.
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
          <Label htmlFor="status">Statut</Label>
          <select
            id="status"
            name="status"
            defaultValue={resource?.status ?? "ready"}
            className={SELECT_CLASS}
          >
            {RESOURCE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-sm">
            Les ressources « À construire » ne sont jamais projetées.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="intentNote">Note d’intention</Label>
          <Input
            id="intentNote"
            name="intentNote"
            placeholder="Ex. À adapter pour le niveau L3"
            defaultValue={resource?.intent_note ?? ""}
          />
          <p className="text-muted-foreground text-sm">
            Note interne pour expliquer ce qu’il reste à faire.
          </p>
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

      {restorable ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
        >
          <span>Un brouillon plus récent existe sur cet appareil.</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setContent(restorable.content);
              setTitle(restorable.title);
              const input = document.getElementById("title") as HTMLInputElement | null;
              if (input && restorable.title) input.value = restorable.title;
              setDirty(true);
              setRestorable(null);
            }}
          >
            Reprendre le brouillon
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              try {
                localStorage.removeItem(draftKey);
              } catch {
                /* sans effet */
              }
              setRestorable(null);
            }}
          >
            Ignorer
          </Button>
        </div>
      ) : null}

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
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
          <div
            id="panel-write"
            role="tabpanel"
            aria-labelledby="tab-write"
            hidden={tab !== "write"}
          >
            <Textarea
              id="content"
              name="content"
              ref={contentRef}
              onPaste={onPasteContent}
              rows={18}
              className="font-mono text-sm"
              aria-describedby="content-hint"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p id="content-hint" className="text-muted-foreground mt-2 text-sm">
              Titres <code>##</code> ou séparateur <code>---</code> = nouvelle diapositive en mode
              présentation. Image déposée sur la ressource :{" "}
              <code>![description](fichier.png)</code>. Tu peux coller depuis Notion ou Word : le
              texte est nettoyé.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button type="button" size="sm" variant="secondary" onClick={cleanAll}>
                Nettoyer le texte
              </Button>
              <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
                {pasteNote}
              </p>
            </div>
            <p
              role="status"
              aria-live="polite"
              className="text-muted-foreground mt-1 min-h-5 text-sm"
            >
              {draftNote}
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

        <aside aria-labelledby="slides-title" className="mt-6 space-y-2 lg:mt-0">
          <h2 id="slides-title" className="text-sm font-medium">
            Diapositives ({slides.length})
          </h2>
          {slides.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Les diapositives apparaissent ici dès que tu écris.
            </p>
          ) : (
            <ol className="max-h-[32rem] space-y-2 overflow-auto">
              {slides.map((sl) => (
                <li key={sl.number} className="bg-card rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    <span className="text-muted-foreground">{sl.number}.</span>{" "}
                    {sl.title ?? "Sans titre"}
                  </p>
                  {sl.summary ? <p className="text-muted-foreground mt-1">{sl.summary}</p> : null}
                  {sl.extras.length ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {sl.extras
                        .map((x) => ({ image: "Image", table: "Tableau", code: "Code" })[x])
                        .join(" · ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      {state.error ? <ActionError error={state.error} /> : null}

      <div className="bg-background/95 sticky bottom-0 -mx-1 flex gap-3 border-t px-1 py-3 backdrop-blur">
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer
        </PendingButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={resource ? `/resources/${resource.id}` : "/resources"}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
