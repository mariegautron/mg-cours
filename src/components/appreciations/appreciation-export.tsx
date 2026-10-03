"use client";

import { useState } from "react";
import { Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { exportAll, exportCsv, type ExportRow } from "@/lib/appreciations/appreciation";

/** « Reporter dans Hyperplanning » : tout copier, CSV. Seules les appréciations écrites sont exportées. */
export function AppreciationExport({ rows, tooLong }: { rows: ExportRow[]; tooLong: number }) {
  const [message, setMessage] = useState("");
  const written = rows.filter((r) => r.text.trim() !== "");

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(exportAll(written));
      setMessage("Tout copié.");
    } catch {
      setMessage("Copie impossible depuis ce navigateur : sélectionne le texte à la main.");
    }
  }

  function downloadCsv() {
    const blob = new Blob(["﻿", exportCsv(written)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "appreciations-hyperplanning.csv";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMessage("CSV téléchargé.");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="touch"
          disabled={written.length === 0}
          onClick={() => void copyAll()}
        >
          <Copy aria-hidden />
          Tout copier
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="touch"
          disabled={written.length === 0}
          onClick={downloadCsv}
        >
          <Download aria-hidden />
          Télécharger le CSV
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {tooLong > 0
          ? `${tooLong} appréciation${tooLong > 1 ? "s dépassent" : " dépasse"} la limite : à raccourcir avant l’export.`
          : "Tableau « nom, appréciation », prêt à coller."}
      </p>
      <p role="status" className="min-h-5 text-sm font-medium">
        {message}
      </p>
    </div>
  );
}
