"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";

import { ActionError } from "@/components/action-error";
import {
  deleteCheckpointFile,
  registerCheckpointFile,
} from "@/app/(app)/modules/[id]/jalons/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { FileCard } from "@/components/files/file-card";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { Button } from "@/components/ui/button";
import {
  CHECKPOINT_FILES_BUCKET,
  checkpointFilePath,
  checkpointFileUrl,
} from "@/lib/checkpoints/checkpoints";
import { failure, SESSION_EXPIRED } from "@/lib/messages";
import {
  RESOURCE_FILE_ACCEPT,
  RESOURCE_FILE_EXTENSIONS,
  RESOURCE_FILE_MAX_BYTES,
  type ResourceFile,
} from "@/lib/resources/files";
import { mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";

/** Fichiers reçus d'un·e étudiant·e pour un jalon : déposer, télécharger, retirer. */
export function CheckpointFiles({
  moduleId,
  checkpointId,
  studentId,
  resultId,
  files,
}: {
  moduleId: string;
  checkpointId: string;
  studentId: string;
  resultId: string | null;
  files: ResourceFile[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [state, setState] = useState<{ error?: string; status?: string }>({});

  async function upload(file: File, input: HTMLInputElement) {
    input.value = "";
    if (file.size > RESOURCE_FILE_MAX_BYTES)
      return setState({ error: "Fichier trop volumineux (50 Mo maximum)." });
    if (!RESOURCE_FILE_EXTENSIONS.test(file.name)) {
      return setState({
        error: "Formats acceptés : PDF, Word, présentation, image (PNG, JPEG, GIF, WebP).",
      });
    }

    setUploading(file.name);
    setState({});
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setUploading(null);
      return setState({ error: SESSION_EXPIRED });
    }
    const mime = mimeOf(file);
    const path = checkpointFilePath(
      auth.user.id,
      checkpointId,
      studentId,
      Date.now(),
      safeName(file.name),
    );
    const { error: uploadError } = await supabase.storage
      .from(CHECKPOINT_FILES_BUCKET)
      .upload(path, file, { contentType: mime });
    if (uploadError) {
      setUploading(null);
      return setState({ error: failure("déposer le fichier") });
    }

    const result = await registerCheckpointFile(moduleId, checkpointId, studentId, {
      path,
      name: file.name,
      size: file.size,
      mime,
    });
    setUploading(null);
    if (result.error) return setState({ error: result.error });
    setState({ status: "Fichier déposé." });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {files.length ? (
        <ul className="space-y-2">
          {files.map((f) => (
            <FileCard key={f.path} name={f.name} mime={f.mime} size={f.size}>
              {resultId ? (
                <Button asChild size="sm" variant="secondary">
                  <a href={checkpointFileUrl(resultId, f.name, true)}>
                    <Download aria-hidden />
                    Télécharger
                    <span className="sr-only"> {f.name}</span>
                  </a>
                </Button>
              ) : null}
              <ConfirmDeleteButton
                itemName={f.name}
                title={`Retirer « ${f.name} » ?`}
                description="Le fichier sera définitivement effacé de ce jalon."
                onConfirm={async () => {
                  await deleteCheckpointFile(moduleId, checkpointId, studentId, f.path);
                  router.refresh();
                }}
              />
            </FileCard>
          ))}
        </ul>
      ) : null}
      <FileDropZone
        id="checkpoint-file"
        label={files.length ? "Ajouter un fichier" : "Déposer un fichier reçu"}
        hint="PDF, Word, présentation ou image · 50 Mo max · un fichier du même nom est remplacé"
        accept={RESOURCE_FILE_ACCEPT}
        compact={files.length > 0}
        busy={uploading ? `Dépôt de « ${uploading} » en cours…` : null}
        onFile={(file, input) => void upload(file, input)}
      />
      {state.error ? <ActionError error={state.error} /> : null}
      {state.status ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.status}
        </p>
      ) : null}
    </div>
  );
}
