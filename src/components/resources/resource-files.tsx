"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Download, Trash2, Upload } from "lucide-react";

import { deleteResourceFile, registerResourceFile } from "@/app/(app)/resources/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  isImageMime,
  RESOURCE_FILE_ACCEPT,
  RESOURCE_FILE_EXTENSIONS,
  RESOURCE_FILE_MAX_BYTES,
  RESOURCE_FILES_BUCKET,
  resourceFileUrl,
  type ResourceFile,
} from "@/lib/resources/files";
import { formatSize, mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";

export function ResourceFiles({
  resourceId,
  files,
}: {
  resourceId: string;
  files: ResourceFile[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ error?: string; status?: string }>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0)
      return setState({ error: "Choisissez un fichier." });
    if (file.size > RESOURCE_FILE_MAX_BYTES)
      return setState({ error: "Fichier trop volumineux (50 Mo maximum)." });
    if (!RESOURCE_FILE_EXTENSIONS.test(file.name)) {
      return setState({
        error: "Formats acceptés : PDF, Word, présentation, image (PNG, JPEG, GIF, WebP).",
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
    const mime = mimeOf(file);
    const path = `${auth.user.id}/${resourceId}/${crypto.randomUUID()}-${safeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(RESOURCE_FILES_BUCKET)
      .upload(path, file, { contentType: mime });
    if (uploadError) {
      setPending(false);
      return setState({ error: "Dépôt impossible. Réessayez." });
    }

    const result = await registerResourceFile(resourceId, {
      path,
      name: file.name,
      size: file.size,
      mime,
    });
    setPending(false);
    if (result.error) return setState({ error: result.error });
    form.reset();
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
            <li key={f.path} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {f.name} <span className="text-muted-foreground">({formatSize(f.size)})</span>
              </span>
              <span className="flex flex-wrap gap-2">
                {isImageMime(f.mime) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copySyntax(f.name)}
                  >
                    <Copy aria-hidden />
                    Copier la syntaxe
                    <span className="sr-only"> de {f.name}</span>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="secondary">
                  <a href={resourceFileUrl(resourceId, f.name, true)}>
                    <Download aria-hidden />
                    Télécharger
                    <span className="sr-only"> {f.name}</span>
                  </a>
                </Button>
                <form action={deleteResourceFile.bind(null, resourceId, f.path)}>
                  <Button type="submit" size="sm" variant="ghost">
                    <Trash2 aria-hidden />
                    Supprimer
                    <span className="sr-only"> {f.name}</span>
                  </Button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Aucun fichier déposé.</p>
      )}
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="resource-file">Déposer un fichier</Label>
          <input
            id="resource-file"
            name="file"
            type="file"
            accept={RESOURCE_FILE_ACCEPT}
            required
            aria-describedby="resource-file-hint"
            className="block text-sm"
          />
          <p id="resource-file-hint" className="text-muted-foreground text-sm">
            PDF, Word, présentation ou image, 50 Mo maximum. Un fichier du même nom est remplacé.
          </p>
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
      {state.status ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.status}
        </p>
      ) : null}
    </div>
  );
}
