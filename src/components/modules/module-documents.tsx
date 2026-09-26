"use client";

import { useActionState } from "react";
import { Download, Trash2, Upload } from "lucide-react";

import {
  deleteModuleDocument,
  uploadModuleDocument,
  type DocumentActionState,
} from "@/app/(app)/modules/[id]/documents/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/types/db";

const initial: DocumentActionState = {};

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
  kind: "school_expectations" | "outline_sent";
  title: string;
  hint: string;
  documents: Tables<"module_document">[];
}) {
  const [state, action, pending] = useActionState(
    uploadModuleDocument.bind(null, moduleId, kind),
    initial,
  );
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
      <form action={action} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={inputId}>Déposer un fichier ({title.toLowerCase()})</Label>
          <input
            id={inputId}
            name="file"
            type="file"
            accept=".pdf,.doc,.docx,.odt"
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
    </div>
  );
}
