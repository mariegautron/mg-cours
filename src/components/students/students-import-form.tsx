"use client";

import { schoolYearOf } from "@/lib/modules/list-state";
import { useActionState } from "react";
import Link from "next/link";

import { ActionError } from "@/components/action-error";
import {
  confirmStudentsImport,
  previewStudentsImport,
  type ImportConfirmState,
  type ImportPreviewState,
} from "@/app/(app)/students/actions";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { plural } from "@/lib/plural";
import { schoolYearLabel } from "@/lib/students/groups";
import { describeGroupPlan } from "@/lib/students/module-groups";
import { currentSchoolYear, schoolYearOptions } from "@/lib/students/years";

const previewInitial: ImportPreviewState = {};
const confirmInitial: ImportConfirmState = {};

export function StudentsImportForm({
  modules,
}: {
  modules: { id: string; name: string; year: number }[];
}) {
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
          {confirmState.enrolled
            ? ` ${confirmState.enrolled} étudiant·e${confirmState.enrolled > 1 ? "s" : ""} déjà en base inscrit·e${confirmState.enrolled > 1 ? "s" : ""} à ${schoolYearLabel(confirmState.year ?? currentSchoolYear())}.`
            : ""}
          {confirmState.moduleName
            ? ` ${confirmState.memberships ?? 0} appartenance${(confirmState.memberships ?? 0) > 1 ? "s" : ""} aux groupes de « ${confirmState.moduleName} »${confirmState.groupsCreated ? ` (${confirmState.groupsCreated} groupe${confirmState.groupsCreated > 1 ? "s" : ""} créé${confirmState.groupsCreated > 1 ? "s" : ""})` : ""}.`
            : ""}
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
          <Label htmlFor="year">Année scolaire</Label>
          <select
            id="year"
            name="year"
            defaultValue={currentSchoolYear()}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            {schoolYearOptions().map((y) => (
              <option key={y} value={y}>
                {schoolYearLabel(y)}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-sm">
            La promotion du fichier est enregistrée pour cette année, y compris pour les étudiant·es
            déjà en base (leurs autres années ne changent pas).
          </p>
        </div>
        <fieldset className="space-y-3 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Groupes d’un module (facultatif)</legend>
          <div className="space-y-2">
            <Label htmlFor="moduleId">Module</Label>
            <select
              id="moduleId"
              name="moduleId"
              defaultValue=""
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">Aucun : promotion seulement</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({schoolYearOf(m.year)})
                </option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-1">
            <legend className="text-sm">La colonne « groupe » du fichier correspond à…</legend>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id="mode-promotion"
                name="mode"
                value="promotion"
                defaultChecked
              />
              <Label htmlFor="mode-promotion" className="font-normal">
                la promotion
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="radio" id="mode-module-group" name="mode" value="module_group" />
              <Label htmlFor="mode-module-group" className="font-normal">
                un groupe du module (créé s’il n’existe pas)
              </Label>
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="allGroupName">Ajouter tout le monde au groupe</Label>
            <input
              id="allGroupName"
              name="allGroupName"
              maxLength={100}
              placeholder="Ex. Classe entière"
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            />
            <p className="text-muted-foreground text-sm">
              Nécessite un module. Le groupe est créé s’il n’existe pas ; les groupes créés sont de
              type TP.
            </p>
          </div>
        </fieldset>
        <div className="space-y-2">
          <FileDropZone
            id="file"
            label="Fichier CSV ou XLSX"
            hint="analyse immédiate, rien n’est importé avant confirmation"
            accept=".csv,.xlsx,.xls"
            busy={previewPending ? "Analyse du fichier…" : null}
            onFile={(_file, input) => input.form?.requestSubmit()}
          />
          <p className="text-muted-foreground text-sm">
            Colonnes reconnues : nom, prénom, e-mail, numéro étudiant, groupe ou promotion (accents
            et casse ignorés).
          </p>
        </div>
        {previewState.error ? <ActionError error={previewState.error} /> : null}
      </form>
    );
  }

  const existing = new Set(previewState.existingEmails ?? []);
  const enrolled = new Set(previewState.enrolledEmails ?? []);
  const yearLabel = schoolYearLabel(previewState.year ?? currentSchoolYear());
  const valid = previewState.rows.filter((r) => r.errors.length === 0);
  const newCount = valid.filter((r) => !r.email || !existing.has(r.email)).length;
  const enrollCount = valid.filter(
    (r) => r.email && existing.has(r.email) && !enrolled.has(r.email),
  ).length;
  const doneCount = valid.filter((r) => r.email && enrolled.has(r.email)).length;
  const validCount = newCount + enrollCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Année {yearLabel}</Badge>
        <Badge variant="secondary">{newCount} à importer</Badge>
        {enrollCount > 0 ? (
          <Badge variant="secondary">{enrollCount} déjà en base, à inscrire</Badge>
        ) : null}
        {doneCount > 0 ? (
          <Badge variant="outline">{plural(doneCount, "déjà inscrit·e", "déjà inscrit·es")}</Badge>
        ) : null}
        {previewState.rows.some((r) => r.errors.length > 0) ? (
          <Badge variant="destructive">
            {previewState.rows.filter((r) => r.errors.length > 0).length} en erreur
          </Badge>
        ) : null}
      </div>

      {previewState.groupPlan ? (
        <section aria-labelledby="group-plan" className="space-y-1 rounded-md border p-3">
          <h2 id="group-plan" className="text-sm font-medium">
            Groupes de « {previewState.moduleName} »
          </h2>
          <p className="text-sm">{describeGroupPlan(previewState.groupPlan)}</p>
        </section>
      ) : null}

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
                      <span className="text-muted-foreground">
                        {enrolled.has(r.email!)
                          ? `déjà inscrit·e à ${yearLabel}`
                          : `déjà en base : inscription à ${yearLabel}`}
                      </span>
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
        <input type="hidden" name="year" value={previewState.year} />
        {previewState.moduleId ? (
          <>
            <input type="hidden" name="moduleId" value={previewState.moduleId} />
            <input type="hidden" name="mode" value={previewState.mode} />
            <input type="hidden" name="allGroupName" value={previewState.allGroupName ?? ""} />
          </>
        ) : null}
        <Button
          type="submit"
          disabled={
            confirmPending || (validCount === 0 && !previewState.groupPlan?.memberships.length)
          }
        >
          {confirmPending ? "Import…" : `Confirmer l’import (${validCount})`}
        </Button>
        <Button type="button" variant="ghost" asChild>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- rechargement complet
              volontaire pour réinitialiser l'état des deux useActionState (aperçu + import) */}
          <a href="/students/import">Choisir un autre fichier</a>
        </Button>
        {confirmState.error ? <ActionError error={confirmState.error} /> : null}
      </form>
    </div>
  );
}
