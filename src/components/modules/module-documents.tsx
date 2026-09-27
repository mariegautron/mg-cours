"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Download, Eye, FileText, Loader2, Plus, Upload } from "lucide-react";

import {
  deleteModuleDocument,
  registerModuleDocument,
} from "@/app/(app)/modules/[id]/documents/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import type { DocumentKind } from "@/lib/modules/documents";
import { formatSize, mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/db";

const MAX_BYTES = 50 * 1024 * 1024;
const EXTENSIONS = /\.(pdf|docx?|odt)$/i;
const ACCEPT = ".pdf,.doc,.docx,.odt";

function kindLabel(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("word") || mime === "application/msword") return "Word";
  if (mime.includes("opendocument")) return "OpenDocument";
  return "Fichier";
}

export function DocumentSlot({
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
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ error?: string; saved?: boolean }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > MAX_BYTES)
      return setState({ error: "Fichier trop volumineux (50 Mo maximum)." });
    if (!EXTENSIONS.test(file.name)) {
      return setState({ error: "Formats acceptés : PDF, Word ou OpenDocument." });
    }

    setUploading(file.name);
    setState({});
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setUploading(null);
      return setState({ error: "Session expirée." });
    }
    const mime = mimeOf(file);
    const path = `${auth.user.id}/${moduleId}/${crypto.randomUUID()}-${safeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("module-documents")
      .upload(path, file, { contentType: mime });
    if (uploadError) {
      setUploading(null);
      return setState({ error: "Dépôt impossible. Réessayez." });
    }

    const result = await registerModuleDocument(moduleId, kind, {
      path,
      name: file.name,
      size: file.size,
      mime,
    });
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
    if (result.error) return setState({ error: result.error });
    setState({ saved: true });
    setOpen(false);
    router.refresh();
  }

  const inputId = `doc-${kind}`;
  const headingId = `doc-${kind}-title`;
  const showZone = documents.length === 0 || open;

  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 id={headingId} className="font-medium">
          {title}
          {documents.length ? (
            <span className="text-muted-foreground font-normal"> ({documents.length})</span>
          ) : null}
        </h3>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </div>

      {documents.length ? (
        <ul className="space-y-2">
          {documents.map((d) => (
            <li key={d.id} className="bg-card rounded-md border p-3 text-sm">
              <div className="flex items-start gap-2">
                <FileText aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium break-all">{d.name}</p>
                  <p className="text-muted-foreground">
                    {kindLabel(d.mime)} · {formatSize(d.size_bytes)} · déposé le{" "}
                    {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {d.mime === "application/pdf" ? (
                  <Button asChild size="sm" variant="secondary">
                    <a
                      href={`/api/modules/${moduleId}/documents/${d.id}?inline=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye aria-hidden />
                      Aperçu
                      <span className="sr-only"> {d.name} — s’ouvre dans un nouvel onglet</span>
                    </a>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="secondary">
                  <a href={`/api/modules/${moduleId}/documents/${d.id}`}>
                    <Download aria-hidden />
                    Télécharger
                    <span className="sr-only"> {d.name}</span>
                  </a>
                </Button>
                <ConfirmDeleteButton
                  itemName={d.name}
                  title={`Supprimer « ${d.name} » ?`}
                  description="Le fichier sera définitivement effacé."
                  onConfirm={() => deleteModuleDocument(moduleId, d.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {uploading ? (
        <p role="status" className="flex items-center gap-2 rounded-md border p-3 text-sm">
          <Loader2 aria-hidden className="size-4 motion-safe:animate-spin" />
          Dépôt de « {uploading} » en cours…
        </p>
      ) : showZone ? (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void upload(file);
          }}
          className={cn(
            "hover:bg-accent focus-within:ring-ring flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-dashed p-4 text-center text-sm focus-within:ring-2",
            dragging && "border-primary bg-accent",
          )}
        >
          <Upload aria-hidden className="text-muted-foreground size-5" />
          <span className="font-medium">
            Déposer un fichier<span className="sr-only"> ({title.toLowerCase()})</span>
          </span>
          <span className="text-muted-foreground">
            Glissez-le ici ou cliquez pour parcourir · PDF, Word, OpenDocument · 50 Mo max
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void upload(file);
            }}
          />
        </label>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setOpen(true);
            setState({});
          }}
        >
          <Plus aria-hidden />
          Ajouter un fichier<span className="sr-only"> ({title.toLowerCase()})</span>
        </Button>
      )}

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
    </section>
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
        kind="external_invoice"
        title="Facture émise hors application"
        hint="PDF d’une facture faite avec un autre outil (ex. Henrri). Voir aussi la page Facturation."
        documents={documents.filter((d) => d.kind === "external_invoice")}
      />
    </div>
  );
}
