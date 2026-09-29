"use client";

import { useActionState, useState, useTransition } from "react";

import { importMoodleXml, type ImportState } from "@/app/(app)/questions/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Label } from "@/components/ui/label";

export function ImportForm() {
  const [state, action, actionPending] = useActionState(importMoodleXml, {} as ImportState);
  const [, startTransition] = useTransition();
  // React vide le champ fichier après chaque envoi : on garde le fichier pour l'étape « Importer ».
  const [file, setFile] = useState<File | null>(null);
  // Fichier vérifié : l'import n'est proposé que pour le fichier dont on a vu l'aperçu.
  const [checked, setChecked] = useState<File | null>(null);
  const pending = actionPending;
  const p = state.preview;
  const run = (mode: "preview" | "import") => {
    const data = new FormData();
    if (file) data.set("file", file);
    data.set("mode", mode);
    if (mode === "preview") setChecked(file);
    startTransition(() => action(data));
  };
  return (
    <form onSubmit={(e) => e.preventDefault()} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Fichier Moodle XML</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xml,text/xml,application/xml"
          aria-describedby="file-hint"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block text-sm"
        />
        <p id="file-hint" className="text-muted-foreground text-sm">
          Dans Moodle : Banque de questions → Exporter → « Moodle XML ». 5 Mo au maximum. Rien n’est
          écrit avant que tu confirmes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <PendingButton
          type="button"
          onClick={() => run("preview")}
          variant="secondary"
          pending={pending}
          pendingLabel="Vérification…"
        >
          Vérifier le fichier
        </PendingButton>
        {p && p.fresh > 0 && state.imported === undefined && checked === file ? (
          <PendingButton
            type="button"
            onClick={() => run("import")}
            pending={pending}
            pendingLabel="Import…"
          >
            Importer {p.fresh} question{p.fresh > 1 ? "s" : ""}
          </PendingButton>
        ) : null}
      </div>

      {state.errors?.length ? (
        <div role="alert" className="text-destructive text-sm">
          <ul className="list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {p ? (
        <div role="status" className="space-y-2 rounded-lg border p-4 text-sm">
          {state.imported !== undefined ? (
            <p className="font-medium">
              {state.imported} question{state.imported > 1 ? "s" : ""} importée
              {state.imported > 1 ? "s" : ""}.
            </p>
          ) : (
            <p className="font-medium">
              {p.total} question{p.total > 1 ? "s" : ""} dans le fichier : {p.fresh} à importer,{" "}
              {p.duplicates} déjà dans ta banque, {p.skipped.length} non reprise
              {p.skipped.length > 1 ? "s" : ""}.
            </p>
          )}
          {p.byCategory.length ? (
            <ul className="list-disc pl-5">
              {p.byCategory.map((c) => (
                <li key={c.category}>
                  {c.category || "Sans catégorie"} : {c.count}
                </li>
              ))}
            </ul>
          ) : null}
          {p.skipped.length ? (
            <div>
              <p className="font-medium">Non reprises :</p>
              <ul className="text-muted-foreground list-disc pl-5">
                {p.skipped.map((s) => (
                  <li key={s.name}>
                    {s.name} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
