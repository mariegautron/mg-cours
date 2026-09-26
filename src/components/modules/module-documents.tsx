"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";

import {
  deleteModuleDocument,
  registerModuleDocument,
} from "@/app/(app)/modules/[id]/documents/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DocumentKind } from "@/lib/modules/documents";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/db";

const MAX_BYTES = 50 * 1024 * 1024;
const EXTENSIONS = /\.(pdf|docx?|odt|pptx?|odp|key)$/i;
const ACCEPT = ".pdf,.doc,.docx,.odt,.ppt,.pptx,.odp,.key";
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odp: "application/vnd.oasis.opendocument.presentation",
  key: "application/vnd.apple.keynote",
};

function safeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-120);
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function DocumentSlot({
  moduleId,
  kind,
  title,
  hint,
  documents,
}: {
  moduleId: string;
  kind: DocumentKind;
  title: string;
  hint: string;
  documents: Tables<"module_document">[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ error?: string; saved?: boolean }>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0)
      return setState({ error: "Choisissez un fichier." });
    if (file.size > MAX_BYTES)
      return setState({ error: "Fichier trop volumineux (50 Mo maximum)." });
    if (!EXTENSIONS.test(file.name)) {
      return setState({
        error: "Formats acceptés : PDF, Word, OpenDocument, PowerPoint, Keynote.",
      });
    }

    setPending(true);
    setState({});
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setPending(false);
      return setState({ error: "Session expirée." });
    }
    const ext = file.name.split(".").pop()!.toLowerCase();
    const mime = file.type || MIME_BY_EXT[ext] || "application/octet-stream";
    const path = `${auth.user.id}/${moduleId}/${crypto.randomUUID()}-${safeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("module-documents")
      .upload(path, file, { contentType: mime });
    if (uploadError) {
      setPending(false);
      return setState({ error: "Dépôt impossible. Réessayez." });
    }

    const result = await registerModuleDocument(moduleId, kind, {
      path,
      name: file.name,
      size: file.size,
      mime,
    });
    setPending(false);
    if (result.error) return setState({ error: result.error });
    form.reset();
    setState({ saved: true });
    router.refresh();
  }
  const inputId = `doc-${kind}`;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </div>
      {documents.length ? (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {d.name}{" "}
                <span className="text-muted-foreground">
                  ({formatSize(d.size_bytes)} · déposé le{" "}
                  {new Date(d.created_at).toLocaleDateString("fr-FR")})
                </span>
              </span>
              <span className="flex gap-2">
                <Button asChild size="sm" variant="secondary">
                  <a href={`/api/modules/${moduleId}/documents/${d.id}`}>
                    <Download aria-hidden />
                    Télécharger
                    <span className="sr-only"> {d.name}</span>
                  </a>
                </Button>
                <form action={deleteModuleDocument.bind(null, moduleId, d.id)}>
                  <Button type="submit" size="sm" variant="ghost">
                    <Trash2 aria-hidden />
                    Supprimer
                    <span className="sr-only"> {d.name}</span>
                  </Button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Aucun document déposé.</p>
      )}
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={inputId}>Déposer un fichier ({title.toLowerCase()})</Label>
          <input
            id={inputId}
            name="file"
            type="file"
            accept={ACCEPT}
            required
            className="block text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          <Upload aria-hidden />
          {pending ? "Dépôt…" : "Déposer"}
        </Button>
      </form>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Document déposé.
        </p>
      ) : null}
    </div>
  );
}

export function ModuleDocuments({
  moduleId,
  documents,
}: {
  moduleId: string;
  documents: Tables<"module_document">[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DocumentSlot
        moduleId={moduleId}
        kind="school_expectations"
        title="Attendus de l’école"
        hint="Fiche pédagogique ou cahier des charges fourni par l’école (PDF, Word)."
        documents={documents.filter((d) => d.kind === "school_expectations")}
      />
      <DocumentSlot
        moduleId={moduleId}
        kind="outline_sent"
        title="Trame envoyée"
        hint="Pour un module déjà réalisé : la trame envoyée à l’école, à conserver ici."
        documents={documents.filter((d) => d.kind === "outline_sent")}
      />
      <DocumentSlot
        moduleId={moduleId}
        kind="slides"
        title="Slides des anciens cours"
        hint="Présentations existantes (PDF, PowerPoint, Keynote, OpenDocument), à conserver avec le module."
        documents={documents.filter((d) => d.kind === "slides")}
      />
    </div>
  );
}
