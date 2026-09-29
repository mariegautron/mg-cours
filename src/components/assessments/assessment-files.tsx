"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";

import { ActionError } from "@/components/action-error";
import {
  deleteAssessmentFile,
  registerAssessmentFile,
} from "@/app/(app)/modules/[id]/assessments/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { FileCard } from "@/components/files/file-card";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { Button } from "@/components/ui/button";
import {
  ASSESSMENT_FILE_ACCEPT,
  ASSESSMENT_FILE_EXTENSIONS,
  ASSESSMENT_FILE_MAX_BYTES,
  ASSESSMENT_FILES_BUCKET,
  assessmentFileUrl,
  type AssessmentFile,
} from "@/lib/assessments/files";
import { mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";
import { failure, SESSION_EXPIRED } from "@/lib/messages";

/** US-90 : fichiers joints au sujet (extrait de code, questions…), téléchargés, jamais affichés. */
export function AssessmentFiles({
  assessmentId,
  files,
}: {
  assessmentId: string;
  files: AssessmentFile[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [state, setState] = useState<{ error?: string; status?: string }>({});

  async function upload(file: File, input: HTMLInputElement) {
    input.value = "";
    if (file.size > ASSESSMENT_FILE_MAX_BYTES)
      return setState({ error: "Fichier trop volumineux (50 Mo maximum)." });
    if (!ASSESSMENT_FILE_EXTENSIONS.test(file.name)) {
      return setState({
        error: "Formats acceptés : PDF, Word, présentation, image, HTML, texte, ZIP.",
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
    const path = `${auth.user.id}/${assessmentId}/${crypto.randomUUID()}-${safeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(ASSESSMENT_FILES_BUCKET)
      .upload(path, file, { contentType: mime });
    if (uploadError) {
      setUploading(null);
      return setState({ error: failure("déposer le fichier") });
    }

    const result = await registerAssessmentFile(assessmentId, {
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
              <Button asChild size="sm" variant="secondary">
                <a href={assessmentFileUrl(assessmentId, f.name)} download>
                  <Download aria-hidden />
                  Télécharger
                  <span className="sr-only"> {f.name}</span>
                </a>
              </Button>
              <ConfirmDeleteButton
                itemName={f.name}
                title={`Supprimer « ${f.name} » ?`}
                description="Le fichier sera définitivement effacé du sujet."
                onConfirm={async () => {
                  await deleteAssessmentFile(assessmentId, f.path);
                  router.refresh();
                }}
              />
            </FileCard>
          ))}
        </ul>
      ) : null}
      <FileDropZone
        id="assessment-file"
        label={files.length ? "Ajouter un fichier" : "Déposer un fichier"}
        hint="PDF, Word, présentation, image, HTML, texte ou ZIP · 50 Mo max · un fichier du même nom est remplacé"
        accept={ASSESSMENT_FILE_ACCEPT}
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
