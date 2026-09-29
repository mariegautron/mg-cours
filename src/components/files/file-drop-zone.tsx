"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Zone de dépôt de fichier : toute la zone est cliquable (label de l'input) et accepte le
 * glisser-déposer. Le fichier part dès la sélection (`onFile`), pas de bouton « Envoyer ».
 * `compact` : une ligne, quand des fichiers sont déjà présents.
 */
export function FileDropZone({
  id,
  label,
  srLabel,
  hint,
  accept,
  name = "file",
  compact = false,
  busy,
  onFile,
}: {
  id: string;
  /** Libellé visible, ex. « Déposer un fichier ». */
  label: string;
  /** Précision pour lecteur d'écran, ajoutée au nom accessible, ex. « (attendus de l’école) ». */
  srLabel?: string;
  /** Formats et taille max, affichés d'emblée. */
  hint: string;
  accept: string;
  name?: string;
  compact?: boolean;
  /** Texte d'avancement (« Dépôt de x.pdf en cours… ») ; remplace la zone tant qu'il est défini. */
  busy?: string | null;
  onFile: (file: File, input: HTMLInputElement) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  if (busy) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-md border p-3 text-sm">
        <Loader2 aria-hidden className="size-4 shrink-0 motion-safe:animate-spin" />
        {busy}
      </p>
    );
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const input = inputRef.current;
        const file = e.dataTransfer.files[0];
        if (!input || !file) return;
        input.files = e.dataTransfer.files;
        onFile(file, input);
      }}
      className={cn(
        "hover:bg-accent focus-within:ring-ring flex cursor-pointer rounded-md border-2 border-dashed text-sm focus-within:ring-2",
        compact ? "items-center gap-3 px-3 py-2" : "flex-col items-center gap-1 p-4 text-center",
        dragging && "border-primary bg-accent",
      )}
    >
      <Upload aria-hidden className="text-muted-foreground size-5 shrink-0" />
      <span className={cn(compact && "flex flex-wrap items-baseline gap-x-2")}>
        <span className="block font-medium">
          {label}
          {srLabel ? <span className="sr-only"> {srLabel}</span> : null}
        </span>
        <span className="text-muted-foreground block">
          {compact ? "Glisser ou cliquer" : "Glisse-le ici ou clique pour parcourir"} · {hint}
        </span>
      </span>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) onFile(file, e.currentTarget);
        }}
      />
    </label>
  );
}
