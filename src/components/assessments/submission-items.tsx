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
import { lateLabel, lateMinutes } from "@/lib/deposits/rules";
import { mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";
import { failure, SESSION_EXPIRED } from "@/lib/messages";

export interface SubmissionOwnerRow {
  owner: SubmissionOwner;
  name: string;
  items: SubmissionItemLike[];
}

const fmtParis = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** Dépôt de l'étudiant·e (le plus récent), ou `null` si rien n'a été déposé par elle ou lui. */
export function studentDeposit(items: SubmissionItemLike[]) {
  const mine = items.filter((i) => i.added_by === "student" && i.submitted_at);
  if (mine.length === 0) return null;
  const at = mine
    .map((i) => i.submitted_at as string)
    .sort()
    .at(-1) as string;
  return { at, by: mine.find((i) => i.submitted_by_name)?.submitted_by_name ?? null };
}

/** « Reçu » / « Reçu en retard (2 h) » / « Pas reçu » : un rendu ajouté à la main compte comme reçu. */
export function receiptStatus(
  items: SubmissionItemLike[],
  deadline: string | null,
): { label: string; received: boolean; late: boolean } {
  if (items.length === 0) return { label: "Pas reçu", received: false, late: false };
  const dep = studentDeposit(items);
  const minutes = dep ? lateMinutes(deadline ? new Date(deadline) : null, new Date(dep.at)) : 0;
  return minutes > 0
    ? { label: `Reçu en retard (${lateLabel(minutes)})`, received: true, late: true }
    : { label: "Reçu", received: true, late: false };
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
              {i.added_by === "student" && i.submitted_at
                ? ` · déposé${i.submitted_by_name ? ` par ${i.submitted_by_name}` : " par l’étudiant·e"} le ${fmtParis(i.submitted_at)}`
                : " · ajouté par toi"}
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
                <a
                  href={`/api/assessments/${assessmentId}/submissions/${i.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
  deadline = null,
}: {
  moduleId: string;
  assessmentId: string;
  rows: SubmissionOwnerRow[];
  /** Date limite (ISO) : sert à signaler un retard, jamais à pénaliser. */
  deadline?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const missingCount = rows.filter((r) => !receiptStatus(r.items, deadline).received).length;

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
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />
          Pas reçu ({missingCount})
        </label>
        <Button asChild size="touch" variant="outline">
          <a href={`/api/assessments/${assessmentId}/submissions/zip`}>
            <Download aria-hidden />
            Tout télécharger (ZIP)
          </a>
        </Button>
      </div>
      <ul className="space-y-4">
        {rows
          .filter((r) => !onlyMissing || !receiptStatus(r.items, deadline).received)
          .map((row) => {
            const id = `${row.owner.kind}-${row.owner.id}`;
            return (
              <li key={id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium">{row.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {receiptStatus(row.items, deadline).label} ·{" "}
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
