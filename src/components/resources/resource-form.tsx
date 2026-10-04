"use client";

import { useActionState, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { ActionError } from "@/components/action-error";
import {
  autosaveResource,
  getResourceSeed,
  listSeedChoices,
  updateResource,
  type ResourceFormState,
} from "@/app/(app)/resources/actions";
import { schoolYearOf } from "@/lib/modules/list-state";
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
  modules = [],
  defaultModuleId = "",
  defaultTitle = "",
}: {
  action: Action;
  resource?: Tables<"resource">;
  /** Modules proposés par « Où l'utiliser ? » (création seulement). */
  modules?: { id: string; name: string; year: number }[];
  defaultModuleId?: string;
  defaultTitle?: string;
  /** Matières proposées dans le champ « Matière » (déjà utilisées + liste guidée). */
  subjects: string[];
}) {
  // Enregistrement automatique côté serveur : une fois la ressource créée en brouillon, « Enregistrer »
  // la met à jour au lieu d'en créer une seconde.
  const savedIdRef = useRef<string | null>(resource?.id ?? null);
  const [autoSavedAt, setAutoSavedAt] = useState("");
  const [state, formAction, pending] = useActionState<ResourceFormState, FormData>(
    (prev, formData) =>
      savedIdRef.current && !resource
        ? updateResource(savedIdRef.current, prev, formData)
        : action(prev, formData),
    {},
  );
  const fe = state.fieldErrors ?? {};
  const [audience, setAudience] = useState<ResourceAudience>(resource?.audience ?? "students");
  const [audienceTouched, setAudienceTouched] = useState(!!resource);
  const [content, setContent] = useState(resource?.content ?? "");
  const [kindValue, setKindValue] = useState<string>(resource?.kind ?? "");
  const [seeds, setSeeds] = useState<{ id: string; title: string }[] | null>(null);
  const [importNote, setImportNote] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [dirty, setDirty] = useState(false);
  const [tick, setTick] = useState(0);
  const tickRef = useRef(0);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);
  useUnsavedChangesGuard(dirty && !pending);

  // Brouillon gardé sur cet appareil (US-152) : pas de version de plus dans l'historique de la ressource.
  const draftKey = `mg-resource-draft:${resource?.id ?? "new"}`;
  const [title, setTitle] = useState(resource?.title ?? defaultTitle);
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

  function insertSnippet(snippet: string) {
    const el = contentRef.current;
    setTab("write");
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    const next = insertAtSelection(content, start, end, snippet);
    setContent(next.text);
    setDirty(true);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  const formRef = useRef<HTMLFormElement>(null);

  // Enregistrement serveur 2,5 s après la dernière modification (titre et type connus).
  useEffect(() => {
    if (!dirty || pending) return;
    const startedAt = tick;
    const timer = setTimeout(async () => {
      const form = formRef.current;
      if (!form) return;
      const result = await autosaveResource(savedIdRef.current, new FormData(form));
      if (!result.savedAt) return;
      if (result.id && !savedIdRef.current) savedIdRef.current = result.id;
      setAutoSavedAt(
        new Date(result.savedAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      // Rien n'a bougé pendant l'envoi : plus rien à perdre en quittant la page.
      setDirty((d) => (startedAt === tickRef.current ? false : d));
    }, 2500);
    return () => clearTimeout(timer);
  }, [dirty, pending, tick]);

  function markReady() {
    const select = formRef.current?.elements.namedItem("status");
    if (select instanceof HTMLSelectElement) select.value = "ready";
    formRef.current?.requestSubmit();
  }

  function onKindChange(kind: string) {
    // Un corrigé, une banque de questions ou des notes sont réservés à l'enseignante par défaut.
    if (!audienceTouched) {
      setAudience((TEACHER_KINDS as readonly string[]).includes(kind) ? "teacher" : "students");
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          /* sans effet */
        }
        keepFormValues(formAction)(e);
      }}
      onChange={() => {
        setDirty(true);
        setTick((n) => n + 1);
      }}
      className="max-w-7xl space-y-5"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <section className="min-w-0 flex-[3_1_0] space-y-3">
          <div
            role="radiogroup"
            aria-label="C’est un…"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-muted-foreground text-sm">C’est un</span>
            {(
              [
                ["course", "Cours"],
                ["workshop", "Atelier"],
                ["project", "Évaluation"],
                ["question_bank", "QCM"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={cn(
                  "has-[:focus-visible]:ring-ring flex min-h-11 cursor-pointer items-center rounded-xl border-[1.5px] px-4 text-sm font-semibold has-[:focus-visible]:ring-2",
                  kindValue === value
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="kind-chip"
                  value={value}
                  checked={kindValue === value}
                  onChange={() => {
                    setKindValue(value);
                    onKindChange(value);
                    setDirty(true);
                  }}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
            <span className="text-muted-foreground text-xs">
              Plus de choix (corrigé, modèle, notes…) dans « Classement ».
            </span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              className="h-12 text-xl font-semibold"
              name="title"
              required
              defaultValue={resource?.title ?? defaultTitle}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={fe.title ? true : undefined}
              aria-describedby={fe.title ? "title-error" : undefined}
            />
            <FieldError id="title" errors={fe.title} />
          </div>

          <div
            role="toolbar"
            aria-label="Mise en forme"
            className="flex flex-wrap items-center gap-2"
          >
            {(
              [
                ["Titre", "\n## Titre\n"],
                ["Liste", "\n- Point\n- Point\n"],
                ["Code", "\n```\ncode\n```\n"],
                ["Image", "\n![description](fichier.png)\n"],
                ["Tableau", "\n| A | B |\n| --- | --- |\n| 1 | 2 |\n"],
              ] as const
            ).map(([label, snippet]) => (
              <Button
                key={label}
                type="button"
                size="touch"
                variant="secondary"
                onClick={() => insertSnippet(snippet)}
              >
                {label}
                <span className="sr-only"> : insérer dans le contenu</span>
              </Button>
            ))}
            <span className="text-muted-foreground text-sm">
              ou écris en Markdown, c’est pareil
            </span>
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
                      tab === value
                        ? "bg-background font-medium shadow-sm"
                        : "text-muted-foreground",
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
                className="min-h-72 font-mono text-sm"
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
                {autoSavedAt ? `Enregistré automatiquement à ${autoSavedAt}.` : draftNote}
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
                  resolveImageSrc={
                    resource ? (src) => resolveImageSrc(resource.id, src) : undefined
                  }
                />
              ) : (
                <p className="text-muted-foreground text-sm">Rien à afficher pour l’instant.</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="focus-within:ring-ring bg-secondary text-secondary-foreground inline-flex min-h-11 cursor-pointer items-center rounded-xl px-4 text-sm font-semibold focus-within:ring-2">
              Importer un fichier
              <input
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  const cleaned = cleanPaste(text);
                  setContent(cleaned);
                  const heading = /^#\s+(.+)$/m.exec(cleaned)?.[1];
                  const input = document.getElementById("title") as HTMLInputElement | null;
                  if (input && !input.value.trim()) {
                    const name = heading ?? file.name.replace(/\.[^.]+$/, "");
                    input.value = name;
                    setTitle(name);
                  }
                  setDirty(true);
                  setImportNote(`« ${file.name} » importé : relis le texte avant d’enregistrer.`);
                  e.target.value = "";
                }}
              />
            </label>
            {seeds === null ? (
              <Button
                type="button"
                size="touch"
                variant="ghost"
                onClick={async () => setSeeds(await listSeedChoices())}
              >
                Partir d’une ressource existante
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Label htmlFor="seed" className="sr-only">
                  Ressource à copier
                </Label>
                <select
                  id="seed"
                  className={SELECT_CLASS}
                  defaultValue=""
                  onChange={async (e) => {
                    const seed = e.target.value ? await getResourceSeed(e.target.value) : null;
                    if (!seed) return;
                    setContent(seed.content);
                    setKindValue(seed.kind ?? "");
                    const set = (id: string, value: string) => {
                      const el = document.getElementById(id) as
                        HTMLInputElement | HTMLTextAreaElement | null;
                      if (el) el.value = value;
                    };
                    set("title", `${seed.title} (copie)`);
                    setTitle(`${seed.title} (copie)`);
                    set("category", seed.category ?? "");
                    set("description", seed.description ?? "");
                    set("tags", seed.tags.join(", "));
                    setDirty(true);
                    setImportNote(`Copié depuis « ${seed.title} » : adapte puis enregistre.`);
                  }}
                >
                  <option value="">Choisir une ressource à copier…</option>
                  {seeds.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <span role="status" aria-live="polite" className="text-muted-foreground text-sm">
              {importNote}
            </span>
          </div>
        </section>

        <aside
          aria-label="Classement et aperçu"
          className="min-w-0 flex-[2_1_0] space-y-3 lg:max-w-md"
        >
          <section className="bg-card space-y-4 rounded-xl border p-4">
            <h2 className="font-heading text-lg font-bold">Classement</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kind">
                  Type <span aria-hidden>*</span>
                </Label>
                <select
                  id="kind"
                  name="kind"
                  required
                  value={kindValue}
                  onChange={(e) => {
                    setKindValue(e.target.value);
                    onKindChange(e.target.value);
                  }}
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

            {!resource && modules.length ? (
              <div className="space-y-2">
                <Label htmlFor="retainModuleId">Où l’utiliser ? (facultatif)</Label>
                <select
                  id="retainModuleId"
                  name="retainModuleId"
                  className={SELECT_CLASS}
                  defaultValue={defaultModuleId}
                  aria-describedby="retain-hint"
                >
                  <option value="">Pas encore</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({schoolYearOf(m.year)})
                    </option>
                  ))}
                </select>
                <p id="retain-hint" className="text-muted-foreground text-sm">
                  La ressource est retenue pour ce module : tu la retrouves dans ses séances et son
                  rapprochement.
                </p>
              </div>
            ) : null}

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
          </section>
          <aside aria-labelledby="slides-title" className="bg-card space-y-2 rounded-xl border p-4">
            <h2 id="slides-title" className="font-heading text-lg font-bold">
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

          {resource ? (
            <section className="bg-card space-y-2 rounded-xl border p-4 text-sm">
              <h2 className="font-heading text-lg font-bold">Questions et corrigé</h2>
              <p className="text-muted-foreground">
                Les questions liées et le corrigé se gèrent depuis la fiche de la ressource.
              </p>
              <Button asChild variant="ghost" size="touch">
                <Link href={`/resources/${resource.id}`}>Ouvrir la fiche</Link>
              </Button>
            </section>
          ) : null}
        </aside>
      </div>

      {state.error ? <ActionError error={state.error} /> : null}

      <div className="bg-background/95 sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t px-1 py-3 backdrop-blur">
        <Button type="button" variant="ghost" asChild>
          <Link href={resource ? `/resources/${resource.id}` : "/resources"}>← Retour</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-sm">
            Pas fini ? Elle reste « À construire ».
          </span>
          <PendingButton
            type="submit"
            variant="secondary"
            pending={pending}
            pendingLabel="Enregistrement…"
          >
            Enregistrer
          </PendingButton>
          <Button type="button" onClick={markReady} disabled={pending}>
            Marquer comme prête
          </Button>
        </div>
      </div>
    </form>
  );
}
