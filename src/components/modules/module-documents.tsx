"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Eye } from "lucide-react";

import {
  deleteModuleDocument,
  registerModuleDocument,
} from "@/app/(app)/modules/[id]/documents/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { FileCard } from "@/components/files/file-card";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { Button } from "@/components/ui/button";
import type { DocumentKind } from "@/lib/modules/documents";
import { mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/db";

const MAX_BYTES = 50 * 1024 * 1024;
const EXTENSIONS = /\.(pdf|docx?|odt)$/i;
const ACCEPT = ".pdf,.doc,.docx,.odt";

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
  const [state, setState] = useState<{ error?: string; saved?: boolean }>({});

  async function upload(file: File, input: HTMLInputElement) {
    input.value = "";
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
    if (result.error) return setState({ error: result.error });
    setState({ saved: true });
    router.refresh();
  }

  const headingId = `doc-${kind}-title`;

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
            <FileCard
              key={d.id}
              name={d.name}
              mime={d.mime}
              size={d.size_bytes}
              date={d.created_at}
            >
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
            </FileCard>
          ))}
        </ul>
      ) : null}

      <FileDropZone
        id={`doc-${kind}`}
        label={documents.length ? "Ajouter un fichier" : "Déposer un fichier"}
        srLabel={`(${title.toLowerCase()})`}
        hint="PDF, Word, OpenDocument · 50 Mo max"
        accept={ACCEPT}
        compact={documents.length > 0}
        busy={uploading ? `Dépôt de « ${uploading} » en cours…` : null}
        onFile={(file, input) => void upload(file, input)}
      />

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
        title="Progression pédagogique envoyée"
        hint="Module déjà réalisé : la progression envoyée à l’école. La déposer ici la compte comme envoyée pour la facturation."
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
