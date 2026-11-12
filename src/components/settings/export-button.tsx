"use client";

import { useState } from "react";
import { strToU8, zipSync } from "fflate";

import { ActionError } from "@/components/action-error";
import { PendingButton } from "@/components/ui/pending-button";
import { filenameFromDisposition } from "@/lib/download";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const mo = (bytes: number) => {
  const n = bytes / (1024 * 1024);
  return n < 1 ? "moins de 1" : n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
};

/** « Exporter mes données » (tableurs + JSON, rapide) et « Exporter mes fichiers » (rendus, photos…). */
export function ExportButton() {
  const [pending, setPending] = useState<"data" | "files" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function exportData() {
    setPending("data");
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error(String(res.status));
      let size: number;
      if (res.headers.get("Content-Type")?.includes("application/json")) {
        const { url, bytes } = (await res.json()) as { url: string; bytes: number };
        window.location.assign(url);
        size = bytes;
      } else {
        const blob = await res.blob();
        save(
          blob,
          filenameFromDisposition(
            res.headers.get("Content-Disposition"),
            "marelle-mes-donnees.zip",
          ),
        );
        size = blob.size;
      }
      setMessage(`Export téléchargé (${mo(size)} Mo).`);
    } catch {
      setError("L’export n’a pas abouti. Réessaie dans un instant.");
    } finally {
      setPending(null);
    }
  }

  async function exportFiles() {
    setPending("files");
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/export/files");
      if (!res.ok) throw new Error(String(res.status));
      const { files, skipped } = (await res.json()) as {
        files: { name: string; url: string }[];
        skipped: string[];
      };
      if (files.length === 0) {
        setMessage("Aucun fichier à exporter.");
        return;
      }
      // Quatre téléchargements à la fois, directement depuis le stockage.
      const out: Record<string, Uint8Array> = {};
      const missed = [...skipped];
      let next = 0;
      let done = 0;
      const worker = async () => {
        while (next < files.length) {
          const f = files[next++];
          try {
            const r = await fetch(f.url);
            if (!r.ok) throw new Error();
            let name = f.name;
            for (let n = 2; out[name]; n++) name = f.name.replace(/(\.[^./]+)?$/, ` (${n})$1`);
            out[name] = new Uint8Array(await r.arrayBuffer());
          } catch {
            missed.push(f.name);
          }
          done++;
          setMessage(`Téléchargement des fichiers : ${done} sur ${files.length}…`);
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      if (missed.length) {
        out["fichiers-non-inclus.txt"] = strToU8(
          `Fichiers non téléchargés (à récupérer dans l’appli) :\r\n${missed.map((m) => `- ${m}`).join("\r\n")}\r\n`,
        );
      }
      const zip = zipSync(out, { level: 0 });
      const today = new Date().toISOString().slice(0, 10);
      save(
        new Blob([zip as BlobPart], { type: "application/zip" }),
        `marelle-mes-fichiers-${today}.zip`,
      );
      setMessage(
        `Fichiers téléchargés (${mo(zip.byteLength)} Mo${missed.length ? `, ${missed.length} non inclus` : ""}).`,
      );
    } catch {
      setError("L’export des fichiers n’a pas abouti. Réessaie dans un instant.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <PendingButton
          type="button"
          variant="outline"
          size="touch"
          pending={pending === "data"}
          pendingLabel="Préparation de l’export…"
          disabled={pending !== null}
          onClick={exportData}
        >
          Exporter mes données (tableurs + JSON)
        </PendingButton>
        <PendingButton
          type="button"
          variant="outline"
          size="touch"
          pending={pending === "files"}
          pendingLabel="Préparation des fichiers…"
          disabled={pending !== null}
          onClick={exportFiles}
        >
          Exporter mes fichiers (rendus, pièces jointes, photos)
        </PendingButton>
      </div>
      <p role="status" className="text-sm">
        {message}
      </p>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
