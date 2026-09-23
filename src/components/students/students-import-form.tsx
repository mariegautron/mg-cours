"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  confirmStudentsImport,
  previewStudentsImport,
  type ImportConfirmState,
  type ImportPreviewState,
} from "@/app/(app)/students/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const previewInitial: ImportPreviewState = {};
const confirmInitial: ImportConfirmState = {};

export function StudentsImportForm() {
  const [previewState, previewAction, previewPending] = useActionState(
    previewStudentsImport,
    previewInitial,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmStudentsImport,
    confirmInitial,
  );

  if (confirmState.created !== undefined) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm">
          {confirmState.created} étudiant·e{confirmState.created > 1 ? "s" : ""} importé·e
          {confirmState.created > 1 ? "s" : ""}.
        </p>
        <Button asChild>
          <Link href="/students">Voir la liste</Link>
        </Button>
      </div>
    );
  }

  if (!previewState.rows) {
    return (
      <form action={previewAction} className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Fichier CSV ou XLSX</Label>
          <Input id="file" name="file" type="file" accept=".csv,.xlsx,.xls" required />
          <p className="text-muted-foreground text-sm">
            Colonnes reconnues : nom, prénom, e-mail, numéro étudiant, groupe (accents et casse
            ignorés).
          </p>
        </div>
        {previewState.error ? (
          <p role="alert" className="text-destructive text-sm">
            {previewState.error}
          </p>
        ) : null}
        <Button type="submit" disabled={previewPending}>
          {previewPending ? "Analyse…" : "Analyser le fichier"}
        </Button>
      </form>
    );
  }

  const existing = new Set(previewState.existingEmails ?? []);
  const validCount = previewState.rows.filter(
    (r) => r.errors.length === 0 && (!r.email || !existing.has(r.email)),
  ).length;
  const duplicateCount = previewState.rows.filter((r) => r.email && existing.has(r.email)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{validCount} à importer</Badge>
        {duplicateCount > 0 ? <Badge variant="outline">{duplicateCount} déjà en base</Badge> : null}
        {previewState.rows.some((r) => r.errors.length > 0) ? (
          <Badge variant="destructive">
            {previewState.rows.filter((r) => r.errors.length > 0).length} en erreur
          </Badge>
        ) : null}
      </div>

      <div className="max-h-96 overflow-y-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th scope="col" className="p-2 text-left">
                Ligne
              </th>
              <th scope="col" className="p-2 text-left">
                Nom
              </th>
              <th scope="col" className="p-2 text-left">
                E-mail
              </th>
              <th scope="col" className="p-2 text-left">
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {previewState.rows.map((r) => {
              const isDuplicate = !!r.email && existing.has(r.email);
              return (
                <tr key={r.rowNumber} className="border-t">
                  <td className="p-2">{r.rowNumber}</td>
                  <td className="p-2">
                    {r.firstName} {r.lastName}
                  </td>
                  <td className="p-2">{r.email ?? "—"}</td>
                  <td className="p-2">
                    {r.errors.length > 0 ? (
                      <span className="text-destructive">{r.errors.join(", ")}</span>
                    ) : isDuplicate ? (
                      <span className="text-muted-foreground">déjà en base</span>
                    ) : (
                      <span>à importer</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form action={confirmAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="rows" value={JSON.stringify(previewState.rows)} />
        <Button type="submit" disabled={confirmPending || validCount === 0}>
          {confirmPending ? "Import…" : `Confirmer l’import (${validCount})`}
        </Button>
        <Button type="button" variant="ghost" asChild>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- rechargement complet
              volontaire pour réinitialiser l'état des deux useActionState (aperçu + import) */}
          <a href="/students/import">Choisir un autre fichier</a>
        </Button>
        {confirmState.error ? (
          <p role="alert" className="text-destructive text-sm">
            {confirmState.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
