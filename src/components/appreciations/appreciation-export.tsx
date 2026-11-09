"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Download } from "lucide-react";

import { setReported } from "@/app/(app)/modules/[id]/appreciations/actions";
import { Button } from "@/components/ui/button";
import { exportAll, exportCsv, type ExportRow } from "@/lib/appreciations/appreciation";

/** « Reporter dans Hyperplanning » : tout copier, CSV. Seules les appréciations écrites sont exportées. */
export function AppreciationExport({
  moduleId,
  rows,
  tooLong,
}: {
  moduleId: string;
  rows: (ExportRow & { studentId: string })[];
  tooLong: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  // Après « Tout copier » ou le CSV : proposer de tout marquer comme reporté (rien n'est coché seul).
  const [offerMark, setOfferMark] = useState(false);
  const [marking, startMark] = useTransition();
  const written = rows.filter((r) => r.text.trim() !== "");

  function markAll() {
    startMark(async () => {
      let failed = 0;
      for (const r of written) {
        const res = await setReported(moduleId, r.studentId, true);
        if (res.error) failed++;
      }
      setOfferMark(false);
      setMessage(
        failed
          ? `${written.length - failed} marquée${written.length - failed > 1 ? "s" : ""} comme reportée${written.length - failed > 1 ? "s" : ""}, ${failed} en échec : réessaie.`
          : `${written.length} appréciation${written.length > 1 ? "s marquées reportées" : " marquée reportée"}.`,
      );
      router.refresh();
    });
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(exportAll(written));
      setMessage("Tout copié.");
      setOfferMark(true);
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
    setOfferMark(true);
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
      {offerMark && written.length > 0 ? (
        <Button type="button" size="touch" disabled={marking} onClick={markAll}>
          {marking
            ? "Marquage…"
            : `Tout marquer comme reporté (${written.length} appréciation${written.length > 1 ? "s" : ""})`}
        </Button>
      ) : null}
    </div>
  );
}
