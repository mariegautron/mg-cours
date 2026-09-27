import { FileText, FileImage, Presentation } from "lucide-react";

import { formatSize } from "@/lib/storage/files";

/** Libellé court du type de fichier, à partir du type MIME. */
export function fileKindLabel(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "Image";
  if (mime.includes("presentation") || mime.includes("powerpoint") || mime.includes("keynote"))
    return "Présentation";
  if (mime.includes("word") || mime.includes("opendocument.text")) return "Texte";
  return "Fichier";
}

function KindIcon({ mime }: { mime: string }) {
  const Icon = mime.startsWith("image/")
    ? FileImage
    : fileKindLabel(mime) === "Présentation"
      ? Presentation
      : FileText;
  return <Icon aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />;
}

/** Carte d'un fichier déposé : nom, type · taille · date, puis actions nommées. */
export function FileCard({
  name,
  mime,
  size,
  date,
  children,
}: {
  name: string;
  mime: string;
  size: number;
  date?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="bg-card rounded-md border p-3 text-sm">
      <div className="flex items-start gap-2">
        <KindIcon mime={mime} />
        <div className="min-w-0">
          <p className="font-medium break-all">{name}</p>
          <p className="text-muted-foreground">
            {fileKindLabel(mime)} · {formatSize(size)}
            {date ? ` · déposé le ${new Date(date).toLocaleDateString("fr-FR")}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </li>
  );
}
