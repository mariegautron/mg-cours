"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Download } from "lucide-react";

import { PendingButton } from "@/components/ui/pending-button";
import { downloadLabels, filenameFromDisposition, type DownloadKind } from "@/lib/download";

type Status = "idle" | "pending" | "done" | "failed";

/**
 * Télécharge un fichier généré à la volée (PDF, archive, XML). Au lieu d'un lien qui laisse le
 * navigateur silencieux pendant la génération (et invite à recliquer), le bouton récupère le
 * fichier, affiche « Préparation du PDF… », puis annonce « PDF téléchargé. ». En cas d'échec, un
 * message inline propose de réessayer ou d'ouvrir le fichier directement. Un second appui
 * pendant la préparation est ignoré (`PendingButton`).
 */
export function DownloadButton({
  href,
  kind = "pdf",
  children,
  icon = <Download aria-hidden />,
  doneLabel,
  fallbackFilename,
  variant = "secondary",
  size = "sm",
  className,
}: {
  href: string;
  kind?: DownloadKind;
  children: ReactNode;
  icon?: ReactNode;
  /** Retour de fin qui nomme l'objet (« Facture 2026-014 téléchargée. »). */
  doneLabel?: string;
  fallbackFilename?: string;
  variant?: ComponentProps<typeof PendingButton>["variant"];
  size?: ComponentProps<typeof PendingButton>["size"];
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState("");
  const labels = downloadLabels(kind);

  async function download() {
    setStatus("pending");
    setDetail("");
    try {
      const response = await fetch(href, { credentials: "same-origin" });
      if (!response.ok) {
        // La route explique l'échec en une phrase (« Export impossible : … ») : on la montre.
        const text = (await response.text().catch(() => "")).trim();
        setDetail(text && text.length < 400 && !text.startsWith("<") ? text : "");
        throw new Error(`HTTP ${response.status}`);
      }
      // Fichier lourd : la route l'a déposé dans le stockage et renvoie une URL signée courte.
      if (response.headers.get("Content-Type")?.includes("application/json")) {
        const { url } = (await response.json()) as { url?: string };
        if (!url) throw new Error("URL absente");
        const link = document.createElement("a");
        link.href = url;
        document.body.append(link);
        link.click();
        link.remove();
        setStatus("done");
        return;
      }
      const blob = await response.blob();
      const name = filenameFromDisposition(
        response.headers.get("Content-Disposition"),
        fallbackFilename ?? `document.${kind}`,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus("done");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <PendingButton
        type="button"
        variant={variant}
        size={size}
        className={className}
        pending={status === "pending"}
        pendingLabel={labels.pending}
        onClick={download}
      >
        {icon}
        {children}
      </PendingButton>
      {/* Zone d'annonce polie sans role="status" : la page a déjà ses propres zones de statut. */}
      <span aria-live="polite" className="text-muted-foreground text-sm">
        {status === "done" ? (doneLabel ?? labels.done) : ""}
      </span>
      {status === "failed" ? (
        <span role="alert" className="text-destructive text-sm">
          {detail || labels.failed} Réessaie dans un instant, ou{" "}
          <a href={href} className="underline underline-offset-2">
            ouvre le fichier directement
          </a>
          .
        </span>
      ) : null}
    </span>
  );
}
