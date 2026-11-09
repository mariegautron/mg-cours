"use client";

import { schoolYearOf } from "@/lib/modules/list-state";
import { useActionState, useMemo, useState } from "react";
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
import {
  buildRows,
  COLUMN_ROLE_LABELS,
  type ColumnRole,
  type RowEdit,
} from "@/lib/students/import";
import { describeGroupPlan } from "@/lib/students/module-groups";
import { currentSchoolYear, schoolYearOptions } from "@/lib/students/years";

const previewInitial: ImportPreviewState = {};
const confirmInitial: ImportConfirmState = {};

const ROLE_ORDER: ColumnRole[] = [
  "fullName",
  "lastName",
  "firstName",
  "email",
  "studentNumber",
  "scholarGroup",
  "ignore",
];

export function StudentsImportForm({
  modules,
  fixedModule,
}: {
  modules: { id: string; name: string; year: number }[];
  /** Import ouvert depuis un module : module imposé, année du module. */
  fixedModule?: { id: string; name: string; year: number };
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
        {confirmState.moduleId ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/modules/${confirmState.moduleId}/groups/wizard`}>
                Faire les groupes maintenant
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/modules/${confirmState.moduleId}/groups`}>Retour au module</Link>
            </Button>
          </div>
        ) : (
          <Button asChild>
            <Link href="/students">Voir la liste</Link>
          </Button>
        )}
      </div>
    );
  }

  if (!previewState.rows) {
    return (
      <form action={previewAction} className="max-w-md space-y-4">
        {fixedModule ? (
          <>
            <input type="hidden" name="year" value={fixedModule.year} />
            <input type="hidden" name="moduleId" value={fixedModule.id} />
            <p className="text-sm">
              Pour <strong>{fixedModule.name}</strong> ({schoolYearOf(fixedModule.year)}) : les
              personnes importées rejoignent les groupes de ce module.
            </p>
          </>
        ) : null}
        <div className={fixedModule ? "hidden" : "space-y-2"}>
          <Label htmlFor="year">Année scolaire</Label>
          <select
            id="year"
            name={fixedModule ? undefined : "year"}
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
          <legend className="px-1 text-sm font-medium">
            {fixedModule ? "Groupes du module" : "Groupes d’un module (facultatif)"}
          </legend>
          <div className={fixedModule ? "hidden" : "space-y-2"}>
            <Label htmlFor="moduleId">Module</Label>
            <select
              id="moduleId"
              name={fixedModule ? undefined : "moduleId"}
              disabled={!!fixedModule}
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
            Colonnes reconnues : nom, prénom, ou les deux dans une seule colonne (« Étudiant », «
            Nom Prénom »… comme dans l’export Hyperplanning), e-mail, numéro étudiant, groupe ou
            promotion. Tu pourras corriger dans l’aperçu.
          </p>
        </div>
        {previewState.error ? <ActionError error={previewState.error} /> : null}
      </form>
    );
  }

  return (
    <ImportPreview
      previewState={previewState}
      confirmAction={confirmAction}
      confirmPending={confirmPending}
      confirmError={confirmState.error}
    />
  );
}

function ImportPreview({
  previewState,
  confirmAction,
  confirmPending,
  confirmError,
}: {
  previewState: ImportPreviewState;
  confirmAction: (formData: FormData) => void;
  confirmPending: boolean;
  confirmError?: string;
}) {
  const [roles, setRoles] = useState<ColumnRole[]>(previewState.roles ?? []);
  const [swap, setSwap] = useState(false);
  const [edits, setEdits] = useState<Record<number, RowEdit>>({});
  const rows = useMemo(
    () =>
      previewState.table
        ? buildRows(previewState.table, roles, {
            nameOrder: previewState.nameOrder,
            swap,
            edits,
          })
        : (previewState.rows ?? []),
    [previewState, roles, swap, edits],
  );
  const headers = previewState.table?.headers ?? [];
  const setRole = (i: number, role: ColumnRole) =>
    setRoles((prev) =>
      prev.map((r, j) => {
        if (j === i) return role;
        // Un rôle (hors « ignorée ») n'appartient qu'à une colonne.
        return role !== "ignore" && r === role ? "ignore" : r;
      }),
    );
  const edit = (rowNumber: number, field: keyof RowEdit, value: string) =>
    setEdits((prev) => ({ ...prev, [rowNumber]: { ...prev[rowNumber], [field]: value } }));

  const existing = new Set(previewState.existingEmails ?? []);
  const enrolled = new Set(previewState.enrolledEmails ?? []);
  const yearLabel = schoolYearLabel(previewState.year ?? currentSchoolYear());
  const valid = rows.filter((r) => r.errors.length === 0);
  const newCount = valid.filter((r) => !r.email || !existing.has(r.email)).length;
  const enrollCount = valid.filter(
    (r) => r.email && existing.has(r.email) && !enrolled.has(r.email),
  ).length;
  const doneCount = valid.filter((r) => r.email && enrolled.has(r.email)).length;
  const validCount = newCount + enrollCount;
  const errorCount = rows.length - valid.length;
  const ignored = headers.filter((_, i) => roles[i] === "ignore");

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
        {errorCount > 0 ? <Badge variant="destructive">{errorCount} en erreur</Badge> : null}
      </div>

      {headers.length > 0 ? (
        <section aria-labelledby="columns" className="space-y-2 rounded-md border p-3">
          <h2 id="columns" className="text-sm font-medium">
            Colonnes du fichier
          </h2>
          <p className="text-sm">
            {headers
              .map((h, i) =>
                roles[i] === "ignore"
                  ? null
                  : `${h || "(sans titre)"} → ${COLUMN_ROLE_LABELS[roles[i]]}`,
              )
              .filter(Boolean)
              .join(" · ")}
            {ignored.length > 0 ? ` · ignorées : ${ignored.join(", ")}` : ""}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {headers.map((h, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Label htmlFor={`role-${i}`} className="font-normal">
                  {h || `Colonne ${i + 1}`}
                </Label>
                <select
                  id={`role-${i}`}
                  value={roles[i] ?? "ignore"}
                  onChange={(e) => setRole(i, e.target.value as ColumnRole)}
                  className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
                >
                  {ROLE_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {COLUMN_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          <Button type="button" size="sm" variant="outline" onClick={() => setSwap((v) => !v)}>
            Inverser nom et prénom
          </Button>
        </section>
      ) : null}

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
                Prénom
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
            {rows.map((r) => {
              const isDuplicate = !!r.email && existing.has(r.email);
              const editable = r.errors.length > 0 || edits[r.rowNumber] !== undefined;
              const cell = (field: keyof RowEdit, label: string) =>
                editable ? (
                  <input
                    aria-label={`${label}, ligne ${r.rowNumber}`}
                    value={(field === "email" ? r.email : r[field]) ?? ""}
                    onChange={(e) => edit(r.rowNumber, field, e.target.value)}
                    className="border-input h-8 w-full min-w-24 rounded-md border bg-transparent px-2"
                  />
                ) : (
                  ((field === "email" ? r.email : r[field]) ?? "—")
                );
              return (
                <tr key={r.rowNumber} className="border-t">
                  <td className="p-2">{r.rowNumber}</td>
                  <td className="p-2">{cell("lastName", "Nom")}</td>
                  <td className="p-2">{cell("firstName", "Prénom")}</td>
                  <td className="p-2">{cell("email", "E-mail")}</td>
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
        <input type="hidden" name="rows" value={JSON.stringify(rows)} />
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
          {/* Rechargement complet : réinitialise l’aperçu et l’import. */}
          <a href="">Choisir un autre fichier</a>
        </Button>
        {confirmError ? <ActionError error={confirmError} /> : null}
      </form>
    </div>
  );
}
