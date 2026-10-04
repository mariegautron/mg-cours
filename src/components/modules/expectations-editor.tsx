"use client";

import { useActionState, useId, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

import { ActionError } from "@/components/action-error";
import {
  readExpectationsFromDocument,
  readExpectationsFromText,
  saveExpectations,
  type ReadExpectationsResult,
} from "@/app/(app)/modules/[id]/expectations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  splitExpectationLabel,
  unitsHours,
  type ExpectationDraft,
  type ExpectationKind,
  type Modality,
} from "@/lib/modules/expectations";
import { normalizeSearch } from "@/lib/resources/picker";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-guard";
import { plural } from "@/lib/plural";
import { keepFormValues } from "@/lib/use-kept-form";
import { failure } from "@/lib/messages";

interface Row {
  key: string;
  id: string | null;
  kind: ExpectationKind;
  label: string;
  modality: Modality | "";
  hours: string;
}

export interface SavedExpectation {
  id: string;
  kind: ExpectationKind;
  label: string;
  hours: number | null;
  modality: Modality | null;
}

const SELECT_CLASS = "border-input h-9 rounded-md border bg-transparent px-3 text-sm";

/**
 * US-53 : attendus de la fiche YNOV — lus dans le PDF déposé ou dans un texte collé, puis
 * entièrement modifiables avant enregistrement. Les unités sont des repères : aucune alerte si on
 * s'en écarte ; seul le total d'heures du module est contraignant.
 */
export function ExpectationsEditor({
  moduleId,
  moduleHours,
  initial,
  document,
}: {
  moduleId: string;
  moduleHours: number;
  initial: SavedExpectation[];
  /** Fiche déposée sur le module (PDF d'origine), si elle existe. */
  document: { id: string; name: string; readable: boolean } | null;
}) {
  const id = useId();
  const toRow = (e: {
    id: string | null;
    kind: ExpectationKind;
    label: string;
    hours: number | null;
    modality: Modality | null;
  }): Row => ({
    key: crypto.randomUUID(),
    id: e.id,
    kind: e.kind,
    label: e.label,
    modality: e.modality ?? "",
    hours: e.hours === null ? "" : String(e.hours),
  });

  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow));
  const [dirty, setDirty] = useState(false);
  const [pasted, setPasted] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reading, startReading] = useTransition();
  const [state, formAction, saving] = useActionState(saveExpectations.bind(null, moduleId), {});
  useUnsavedChangesGuard(dirty);

  const change = (updater: (prev: Row[]) => Row[]) => {
    setRows(updater);
    setDirty(true);
  };

  const applyRead = (result: ReadExpectationsResult) => {
    if (result.error || !result.drafts) {
      setError(result.error ?? failure("lire le fichier"));
      setNotice("");
      return;
    }
    const drafts: ExpectationDraft[] = result.drafts;
    setError("");
    // La lecture propose : elle remplace le contenu affiché, à vérifier avant d'enregistrer.
    // Un attendu déjà enregistré garde son identité (et ses liens futurs) s'il est relu à l'identique.
    change((prev) => {
      const known = new Map(
        prev.filter((r) => r.id).map((r) => [`${r.kind}|${normalizeSearch(r.label)}`, r.id]),
      );
      return drafts.map((d) =>
        toRow({ ...d, id: known.get(`${d.kind}|${normalizeSearch(d.label)}`) ?? null }),
      );
    });
    setNotice(
      `${plural(drafts.filter((d) => d.kind === "objective").length, "objectif")} et ${plural(drafts.filter((d) => d.kind === "unit").length, "unité")} lus. Vérifie, corrige, puis enregistre.`,
    );
  };

  const patch = (key: string, p: Partial<Row>) =>
    change((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const add = (kind: ExpectationKind) =>
    change((prev) => [
      ...prev,
      { key: crypto.randomUUID(), id: null, kind, label: "", modality: "", hours: "" },
    ]);

  const payload = JSON.stringify(
    rows
      .filter((r) => r.label.trim())
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        label: r.label.trim(),
        hours:
          r.kind === "unit" && r.hours.trim() !== "" ? Number(r.hours.replace(",", ".")) : null,
        modality: r.kind === "unit" && r.modality ? r.modality : null,
      })),
  );

  const units = rows.filter((r) => r.kind === "unit");
  const indicative = unitsHours(
    units.map((u) => ({
      kind: "unit" as const,
      hours:
        u.hours.trim() === "" || Number.isNaN(Number(u.hours.replace(",", ".")))
          ? null
          : Number(u.hours.replace(",", ".")),
    })),
  );

  // « Scinder » : un attendu qui en contient plusieurs (puces, lignes) devient autant de lignes.
  const splitRow = (r: Row) =>
    change((prev) => {
      const parts = splitExpectationLabel(r.label);
      if (parts.length < 2) return prev;
      return prev.flatMap((x) =>
        x.key !== r.key
          ? [x]
          : parts.map((label, i) =>
              i === 0
                ? { ...x, label }
                : {
                    key: crypto.randomUUID(),
                    id: null,
                    kind: "objective" as const,
                    label,
                    modality: "" as const,
                    hours: "",
                  },
            ),
      );
    });

  const renderRow = (r: Row, index: number) => (
    <li key={r.key} className="flex flex-wrap items-start gap-2">
      <Textarea
        aria-label={`${r.kind === "objective" ? "Objectif" : "Unité"} ${index + 1}`}
        rows={2}
        className="min-w-64 flex-1"
        value={r.label}
        maxLength={1000}
        onChange={(e) => patch(r.key, { label: e.target.value })}
      />
      {r.kind === "unit" ? (
        <>
          <select
            aria-label={`Modalité de l’unité ${index + 1}`}
            className={SELECT_CLASS}
            value={r.modality}
            onChange={(e) => patch(r.key, { modality: e.target.value as Modality | "" })}
          >
            <option value="">Modalité</option>
            <option value="FFP">FFP</option>
            <option value="TDP">TDP</option>
          </select>
          <Input
            aria-label={`Heures de l’unité ${index + 1}`}
            className="w-24"
            inputMode="decimal"
            placeholder="Heures"
            value={r.hours}
            onChange={(e) => patch(r.key, { hours: e.target.value })}
          />
        </>
      ) : null}
      {splitExpectationLabel(r.label).length > 1 ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={`Scinder ${r.kind === "objective" ? "l’objectif" : "l’unité"} ${index + 1} en ${splitExpectationLabel(r.label).length} attendus`}
          onClick={() => splitRow(r)}
        >
          Scinder
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`Supprimer ${r.kind === "objective" ? "l’objectif" : "l’unité"} ${index + 1}`}
        onClick={() => change((prev) => prev.filter((x) => x.key !== r.key))}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );

  const objectives = rows.filter((r) => r.kind === "objective");

  return (
    <div className="space-y-6">
      <section aria-labelledby={`${id}-read`} className="space-y-3 rounded-lg border p-4">
        <h2 id={`${id}-read`} className="text-lg font-medium">
          Lire la fiche de l’école
        </h2>
        {document ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={reading || !document.readable}
              onClick={() =>
                startReading(async () => applyRead(await readExpectationsFromDocument(moduleId)))
              }
            >
              Lire « {document.name} »
            </Button>
            <a
              href={`/api/modules/${moduleId}/documents/${document.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline underline-offset-2"
            >
              Ouvrir le PDF d’origine
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
            {!document.readable ? (
              <span className="text-muted-foreground text-sm">
                Ce fichier n’est pas un PDF : colle son texte ci-dessous.
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucune fiche déposée. Dépose-la dans « Attendus de l’école » (onglet Administratif) ou
            colle son texte ci-dessous.
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor={`${id}-paste`}>Ou coller le texte (une ligne = un attendu)</Label>
          <Textarea
            id={`${id}-paste`}
            rows={5}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={
              "Recueillir et formaliser un besoin client\nÉvaluer la faisabilité technique"
            }
          />
          <Button
            type="button"
            variant="secondary"
            disabled={reading || !pasted.trim()}
            onClick={() =>
              startReading(async () => applyRead(await readExpectationsFromText(pasted)))
            }
          >
            Lire ce texte
          </Button>
        </div>
        <p aria-live="polite" className="text-sm">
          {notice}
        </p>
        {error ? <ActionError error={error} /> : null}
      </section>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          setDirty(false);
          keepFormValues(formAction)(event);
        }}
      >
        <input type="hidden" name="expectationsJson" value={payload} />

        <section aria-labelledby={`${id}-objectives`} className="space-y-3">
          <h2 id={`${id}-objectives`} className="text-lg font-medium">
            Objectifs pédagogiques ({objectives.length})
          </h2>
          {objectives.length ? (
            <ul className="space-y-2">{objectives.map((r, i) => renderRow(r, i))}</ul>
          ) : (
            <p className="text-muted-foreground text-sm">Aucun objectif pour l’instant.</p>
          )}
          <Button type="button" size="sm" variant="secondary" onClick={() => add("objective")}>
            <Plus aria-hidden />
            Ajouter un objectif
          </Button>
        </section>

        <section aria-labelledby={`${id}-units`} className="space-y-3">
          <h2 id={`${id}-units`} className="text-lg font-medium">
            Unités pédagogiques ({units.length})
          </h2>
          <p className="text-muted-foreground text-sm">
            Repères indicatifs : modalité et heures peuvent différer de ta progression sans aucune
            alerte. Seul le total du module ({moduleHours} h) est contraignant.
            {units.length ? ` Les unités comptent ${indicative} h à titre indicatif.` : ""}
          </p>
          {units.length ? (
            <ul className="space-y-2">{units.map((r, i) => renderRow(r, i))}</ul>
          ) : null}
          <Button type="button" size="sm" variant="secondary" onClick={() => add("unit")}>
            <Plus aria-hidden />
            Ajouter une unité
          </Button>
        </section>

        {state.error ? <ActionError error={state.error} /> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer les attendus"}
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link
              href={`/modules/${moduleId}`}
              onClick={(e) => {
                if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?")) {
                  e.preventDefault();
                }
              }}
            >
              Retour au module
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
