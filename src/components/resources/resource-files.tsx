"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Download, Eye } from "lucide-react";

import { deleteResourceFile, registerResourceFile } from "@/app/(app)/resources/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { FileCard } from "@/components/files/file-card";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { Button } from "@/components/ui/button";
import {
  isImageMime,
  RESOURCE_FILE_ACCEPT,
  RESOURCE_FILE_EXTENSIONS,
  RESOURCE_FILE_MAX_BYTES,
  RESOURCE_FILES_BUCKET,
  resourceFileUrl,
  type ResourceFile,
} from "@/lib/resources/files";
import { mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";

export function ResourceFiles({
  resourceId,
  files,
}: {
  resourceId: string;
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
      return setState({ error: "Session expirée." });
    }
    const mime = mimeOf(file);
    const path = `${auth.user.id}/${resourceId}/${crypto.randomUUID()}-${safeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(RESOURCE_FILES_BUCKET)
      .upload(path, file, { contentType: mime });
    if (uploadError) {
      setUploading(null);
      return setState({ error: "Dépôt impossible. Réessayez." });
    }

    const result = await registerResourceFile(resourceId, {
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

  async function copySyntax(name: string) {
    try {
      const src = encodeURIComponent(name).replace(/\(/g, "%28").replace(/\)/g, "%29");
      await navigator.clipboard.writeText(`![${name.replace(/[[\]]/g, "")}](${src})`);
      setState({ status: `Syntaxe de l’image « ${name} » copiée : collez-la dans le contenu.` });
    } catch {
      setState({ error: "Copie impossible." });
    }
  }

  return (
    <div className="space-y-3">
      {files.length ? (
        <ul className="space-y-2">
          {files.map((f) => (
            <FileCard key={f.path} name={f.name} mime={f.mime} size={f.size}>
              {f.mime === "application/pdf" || isImageMime(f.mime) ? (
                <Button asChild size="sm" variant="secondary">
                  <a
                    href={resourceFileUrl(resourceId, f.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye aria-hidden />
                    Aperçu
                    <span className="sr-only"> {f.name} — s’ouvre dans un nouvel onglet</span>
                  </a>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="secondary">
                <a href={resourceFileUrl(resourceId, f.name, true)}>
                  <Download aria-hidden />
                  Télécharger
                  <span className="sr-only"> {f.name}</span>
                </a>
              </Button>
              {isImageMime(f.mime) ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => copySyntax(f.name)}>
                  <Copy aria-hidden />
                  Copier la syntaxe
                  <span className="sr-only"> de {f.name}</span>
                </Button>
              ) : null}
              <ConfirmDeleteButton
                itemName={f.name}
                title={`Supprimer « ${f.name} » ?`}
                description="Le fichier sera définitivement effacé ; une image affichée dans le contenu n’apparaîtra plus."
                onConfirm={() => deleteResourceFile(resourceId, f.path)}
              />
            </FileCard>
          ))}
        </ul>
      ) : null}
      <FileDropZone
        id="resource-file"
        label={files.length ? "Ajouter un fichier" : "Déposer un fichier"}
        hint="PDF, Word, présentation ou image · 50 Mo max · un fichier du même nom est remplacé"
        accept={RESOURCE_FILE_ACCEPT}
        compact={files.length > 0}
        busy={uploading ? `Dépôt de « ${uploading} » en cours…` : null}
        onFile={(file, input) => void upload(file, input)}
      />
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.status ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.status}
        </p>
      ) : null}
    </div>
  );
}
