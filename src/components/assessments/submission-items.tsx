"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";

import { ActionError } from "@/components/action-error";
import {
  addSubmissionLink,
  deleteSubmissionItem,
  registerSubmissionFile,
  type SubmissionOwner,
} from "@/app/(app)/modules/[id]/assessments/submission-items-actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ASSESSMENT_FILE_ACCEPT, ASSESSMENT_FILES_BUCKET } from "@/lib/assessments/files";
import {
  itemTitle,
  linkHost,
  submissionSummary,
  validateFile,
  type SubmissionItemLike,
} from "@/lib/projects/submission-items";
import { mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";
import { failure, SESSION_EXPIRED } from "@/lib/messages";

export interface SubmissionOwnerRow {
  owner: SubmissionOwner;
  name: string;
  items: SubmissionItemLike[];
}

/** Liste des éléments d'un rendu avec « Ouvrir » (nouvel onglet pour un lien, téléchargement pour un fichier). */
export function ItemList({
  assessmentId,
  items,
  onDelete,
}: {
  assessmentId: string;
  items: SubmissionItemLike[];
  onDelete?: (id: string) => Promise<void>;
}) {
  return (
    <ul className="space-y-1 text-sm">
      {items.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {itemTitle(i)}
            <span className="text-muted-foreground">
              {i.kind === "link" && i.url ? ` · ${linkHost(i.url)}` : " · fichier"}
            </span>
          </span>
          <span className="flex gap-1">
            {i.kind === "link" && i.url ? (
              <Button asChild size="touch" variant="secondary">
                <a href={i.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden />
                  Ouvrir<span className="sr-only"> {itemTitle(i)} (nouvel onglet)</span>
                </a>
              </Button>
            ) : (
              <Button asChild size="touch" variant="secondary">
                <a href={`/api/assessments/${assessmentId}/submissions/${i.id}`} download>
                  <Download aria-hidden />
                  Ouvrir<span className="sr-only"> {itemTitle(i)} (téléchargement)</span>
                </a>
              </Button>
            )}
            {onDelete ? (
              <ConfirmDeleteButton
                itemName={itemTitle(i)}
                title={`Supprimer « ${itemTitle(i)} » ?`}
                description="L’élément sera retiré du rendu (un fichier est effacé)."
                onConfirm={() => onDelete(i.id)}
              />
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Rendus multiples (US-145) : plusieurs fichiers ou liens par personne ou par groupe, ajoutés par
 * toi. Le dépôt par l'étudiant·e viendra plus tard.
 */
export function SubmissionItems({
  moduleId,
  assessmentId,
  rows,
}: {
  moduleId: string;
  assessmentId: string;
  rows: SubmissionOwnerRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function addLink(row: SubmissionOwnerRow, form: HTMLFormElement) {
    const data = new FormData(form);
    const result = await addSubmissionLink(
      moduleId,
      assessmentId,
      row.owner,
      String(data.get("url") ?? ""),
      String(data.get("label") ?? ""),
    );
    if (result.error) return setError(result.error);
    setError(null);
    setStatus(`Lien ajouté pour ${row.name}.`);
    form.reset();
    router.refresh();
  }

  async function addFile(row: SubmissionOwnerRow, file: File, input: HTMLInputElement) {
    input.value = "";
    const check = validateFile(file);
    if (!check.ok) return setError(check.error);
    setBusy(file.name);
    setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(null);
      return setError(SESSION_EXPIRED);
    }
    const mime = mimeOf(file);
    const path = `${auth.user.id}/${assessmentId}/submissions/${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(ASSESSMENT_FILES_BUCKET)
      .upload(path, file, { contentType: mime });
    if (uploadError) {
      setBusy(null);
      return setError(failure("déposer le fichier"));
    }
    const result = await registerSubmissionFile(
      moduleId,
      assessmentId,
      row.owner,
      { path, name: file.name, size: file.size, mime },
      "",
    );
    setBusy(null);
    if (result.error) return setError(result.error);
    setStatus(`Fichier ajouté pour ${row.name}.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p role="status" className="min-h-5 text-sm">
        {status}
      </p>
      {error ? <ActionError error={error} /> : null}
      <ul className="space-y-4">
        {rows.map((row) => {
          const id = `${row.owner.kind}-${row.owner.id}`;
          return (
            <li key={id} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{row.name}</h3>
                <p className="text-muted-foreground text-sm">
                  {submissionSummary(row.items.length)}
                </p>
              </div>
              <ItemList
                assessmentId={assessmentId}
                items={row.items}
                onDelete={async (itemId) => {
                  const r = await deleteSubmissionItem(moduleId, assessmentId, itemId);
                  if (r.error) setError(r.error);
                  router.refresh();
                }}
              />
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void addLink(row, e.currentTarget);
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor={`${id}-url`}>Lien à ajouter ({row.name})</Label>
                  <Input
                    id={`${id}-url`}
                    name="url"
                    placeholder="github.com/…"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-label`}>Étiquette (facultatif)</Label>
                  <Input id={`${id}-label`} name="label" maxLength={200} autoComplete="off" />
                </div>
                <Button type="submit" size="touch" variant="secondary">
                  Ajouter le lien<span className="sr-only"> pour {row.name}</span>
                </Button>
              </form>
              <FileDropZone
                id={`${id}-file`}
                label="Ajouter un fichier"
                srLabel={`(rendu de ${row.name})`}
                hint="PDF, Word, présentation, image, texte ou ZIP · 50 Mo max"
                accept={ASSESSMENT_FILE_ACCEPT}
                compact
                busy={busy ? `Dépôt de « ${busy} » en cours…` : null}
                onFile={(file, input) => void addFile(row, file, input)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
