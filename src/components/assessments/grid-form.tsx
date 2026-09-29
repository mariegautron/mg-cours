"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import type { GridFormState } from "@/app/(app)/assessments/grids/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GridWithCriteria } from "@/lib/assessments/queries";

type Action = (state: GridFormState, formData: FormData) => Promise<GridFormState>;

interface LevelRow {
  key: string;
  points: string;
  description: string;
}

interface AxisRow {
  /** Clé stable (l'identifiant pour un axe existant), envoyée avec les critères qui s'y rattachent. */
  key: string;
  id?: string;
  label: string;
}

interface Row {
  /** Clé stable pour React et le focus, distincte de `id` (un nouveau critère n'a pas d'id). */
  key: string;
  id?: string;
  label: string;
  weight: string;
  description: string;
  levels: LevelRow[];
  /** Clé de l'axe (`AxisRow.key`), chaîne vide : sans axe. */
  axisKey: string;
  reference: string;
  isBonus: boolean;
}

/** Barème d'un critère : palier le plus haut s'il y a des paliers, sinon les points saisis. */
function criterionPoints(row: Row): number {
  if (row.levels.length) return Math.max(0, ...row.levels.map((l) => Number(l.points) || 0));
  return Number(row.weight) || 0;
}

function emptyRow(): Row {
  return {
    key: crypto.randomUUID(),
    label: "",
    weight: "",
    description: "",
    levels: [],
    axisKey: "",
    reference: "",
    isBonus: false,
  };
}

export function GridForm({ action, grid }: { action: Action; grid?: GridWithCriteria }) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const focusKeyRef = useRef<string | null>(null);

  const [rows, setRows] = useState<Row[]>(() =>
    grid?.criteria.length
      ? grid.criteria.map((c) => ({
          key: c.id,
          id: c.id,
          label: c.label,
          weight: String(c.weight),
          description: c.description ?? "",
          levels: c.levels.map((l) => ({
            key: l.id,
            points: String(l.points),
            description: l.description,
          })),
          axisKey: c.axis_id ?? "",
          reference: c.reference ?? "",
          isBonus: c.is_bonus,
        }))
      : [emptyRow()],
  );
  const [axes, setAxes] = useState<AxisRow[]>(() =>
    (grid?.axes ?? []).map((a) => ({ key: a.id, id: a.id, label: a.label })),
  );
  const focusAxisRef = useRef<string | null>(null);

  // Ouvre la confirmation dès que l'action serveur la demande (pas de useEffect : la
  // réponse de l'action arrive déjà en dehors du rendu, donc l'ajuster ici ne boucle pas).
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.confirmRequired) setConfirming(true);
  }

  useEffect(() => {
    if (!focusKeyRef.current) return;
    const el = document.getElementById(`criterion-label-${focusKeyRef.current}`);
    el?.focus();
    focusKeyRef.current = null;
  }, [rows]);

  useEffect(() => {
    if (!focusAxisRef.current) return;
    document.getElementById(`axis-label-${focusAxisRef.current}`)?.focus();
    focusAxisRef.current = null;
  }, [axes]);

  const total = rows.reduce((sum, r) => sum + (r.isBonus ? 0 : criterionPoints(r)), 0);
  const bonusTotal = rows.reduce((sum, r) => sum + (r.isBonus ? criterionPoints(r) : 0), 0);

  function addAxis() {
    const axis: AxisRow = { key: crypto.randomUUID(), label: "" };
    focusAxisRef.current = axis.key;
    setAxes((as) => [...as, axis]);
    setAnnouncement("Axe ajouté.");
  }

  function removeAxis(key: string) {
    const index = axes.findIndex((a) => a.key === key);
    const removed = axes[index];
    const next = axes.filter((a) => a.key !== key);
    const fallback = next[index] ?? next[index - 1];
    if (fallback) focusAxisRef.current = fallback.key;
    else document.getElementById("add-axis")?.focus();
    setAxes(next);
    // Les critères de cet axe redeviennent « sans axe ».
    setRows((rs) => rs.map((r) => (r.axisKey === key ? { ...r, axisKey: "" } : r)));
    setAnnouncement(`Axe « ${removed.label || "sans nom"} » supprimé.`);
  }

  function moveAxis(key: string, direction: -1 | 1) {
    setAxes((as) => {
      const index = as.findIndex((a) => a.key === key);
      const target = index + direction;
      if (target < 0 || target >= as.length) return as;
      const next = [...as];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const row = emptyRow();
    focusKeyRef.current = row.key;
    setRows((rs) => [...rs, row]);
    setAnnouncement("Critère ajouté.");
  }

  function removeRow(key: string) {
    const index = rows.findIndex((r) => r.key === key);
    const removed = rows[index];
    const next = rows.filter((r) => r.key !== key);
    const fallback = next[index] ?? next[index - 1];
    focusKeyRef.current = fallback?.key ?? null;
    setRows(next.length ? next : [emptyRow()]);
    setAnnouncement(`Critère « ${removed.label || "sans titre"} » supprimé.`);
  }

  function move(key: string, direction: -1 | 1) {
    setRows((rs) => {
      const index = rs.findIndex((r) => r.key === key);
      const target = index + direction;
      if (target < 0 || target >= rs.length) return rs;
      const next = [...rs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function submit(confirmDelete: boolean) {
    if (confirmInputRef.current) confirmInputRef.current.value = confirmDelete ? "1" : "";
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(e) => {
        const payload = rows.map((r) => ({
          id: r.id,
          label: r.label.trim(),
          weight: r.levels.length ? criterionPoints(r) : Number(r.weight),
          description: r.description.trim(),
          axisKey: r.axisKey || null,
          reference: r.reference.trim(),
          isBonus: r.isBonus,
          levels: r.levels.map((l) => ({
            points: Number(l.points),
            description: l.description.trim(),
          })),
        }));
        const hidden = e.currentTarget.elements.namedItem("criteriaJson") as HTMLInputElement;
        hidden.value = JSON.stringify(payload);
        const axesHidden = e.currentTarget.elements.namedItem("axesJson") as HTMLInputElement;
        axesHidden.value = JSON.stringify(
          axes.map((a) => ({ key: a.key, id: a.id, label: a.label.trim() })),
        );
      }}
      className="max-w-2xl space-y-6"
    >
      <input type="hidden" name="criteriaJson" />
      <input type="hidden" name="axesJson" />
      <input ref={confirmInputRef} type="hidden" name="confirmDeleteCriteria" />

      <div className="space-y-2">
        <Label htmlFor="name">Nom de la grille</Label>
        <Input id="name" name="name" required defaultValue={grid?.name ?? ""} />
        {fe.name?.length ? (
          <p role="alert" className="text-destructive text-sm">
            {fe.name.join(" ")}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={grid?.description ?? ""}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Axes (facultatif)</legend>
        <p className="text-muted-foreground text-sm">
          Regroupez les critères par axe : chaque axe affiche son sous-total à la correction.
        </p>
        {axes.length > 0 ? (
          <ul className="space-y-2">
            {axes.map((axis, i) => (
              <li key={axis.key} className="flex flex-wrap items-end gap-2">
                <div className="min-w-40 flex-1 space-y-1">
                  <Label htmlFor={`axis-label-${axis.key}`}>Nom de l’axe {i + 1}</Label>
                  <Input
                    id={`axis-label-${axis.key}`}
                    value={axis.label}
                    onChange={(e) =>
                      setAxes((as) =>
                        as.map((a) => (a.key === axis.key ? { ...a, label: e.target.value } : a)),
                      )
                    }
                    required
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={i === 0}
                    onClick={() => moveAxis(axis.key, -1)}
                    aria-label={`Monter l’axe ${i + 1}`}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={i === axes.length - 1}
                    onClick={() => moveAxis(axis.key, 1)}
                    aria-label={`Descendre l’axe ${i + 1}`}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeAxis(axis.key)}
                    aria-label={`Supprimer l’axe ${i + 1}`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <Button id="add-axis" type="button" size="sm" variant="secondary" onClick={addAxis}>
          <Plus aria-hidden />
          Ajouter un axe
        </Button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Critères</legend>
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
        <ul className="space-y-3">
          {rows.map((row, index) => (
            <CriterionRow
              key={row.key}
              row={row}
              index={index}
              count={rows.length}
              onChange={(patch) => updateRow(row.key, patch)}
              onRemove={() => removeRow(row.key)}
              onMoveUp={() => move(row.key, -1)}
              onMoveDown={() => move(row.key, 1)}
              announce={setAnnouncement}
              axes={axes}
            />
          ))}
        </ul>
        <Button type="button" size="sm" variant="secondary" onClick={addRow}>
          <Plus aria-hidden />
          Ajouter un critère
        </Button>
        <p className="text-muted-foreground text-sm">
          Barème total : {total} points
          {bonusTotal > 0 ? ` (+ ${bonusTotal} de bonus hors barème)` : ""}.
        </p>
        {fe.criteriaJson?.length ? (
          <p role="alert" className="text-destructive text-sm">
            {fe.criteriaJson.join(" ")}
          </p>
        ) : null}
      </fieldset>

      {state.error && !state.confirmRequired ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer
        </PendingButton>
        <Button type="button" variant="ghost" asChild>
          <Link href="/assessments/grids">Annuler</Link>
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer un critère déjà noté ?</AlertDialogTitle>
            <AlertDialogDescription>{state.error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revoir les critères</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false);
                submit(true);
              }}
            >
              Confirmer et enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function CriterionRow({
  row,
  index,
  count,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  announce,
  axes,
}: {
  row: Row;
  index: number;
  count: number;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  announce: (message: string) => void;
  axes: AxisRow[];
}) {
  const uid = useId();
  const focusLevelRef = useRef<string | null>(null);
  const hasLevels = row.levels.length > 0;

  useEffect(() => {
    if (!focusLevelRef.current) return;
    document.getElementById(`level-points-${focusLevelRef.current}`)?.focus();
    focusLevelRef.current = null;
  }, [row.levels]);

  function addLevel() {
    const level: LevelRow = { key: crypto.randomUUID(), points: "", description: "" };
    focusLevelRef.current = level.key;
    onChange({ levels: [...row.levels, level] });
    announce(`Palier ajouté au critère ${index + 1}.`);
  }

  function updateLevel(key: string, patch: Partial<LevelRow>) {
    onChange({ levels: row.levels.map((l) => (l.key === key ? { ...l, ...patch } : l)) });
  }

  function removeLevel(key: string) {
    const position = row.levels.findIndex((l) => l.key === key);
    const remaining = row.levels.filter((l) => l.key !== key);
    const next = remaining[position] ?? remaining[position - 1];
    // Sans palier restant, le focus revient sur le bouton d'ajout.
    if (next) focusLevelRef.current = next.key;
    else document.getElementById(`${uid}-add-level`)?.focus();
    onChange({ levels: remaining });
    announce(`Palier ${position + 1} du critère ${index + 1} supprimé.`);
  }

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1">
          <Label htmlFor={`criterion-label-${row.key}`}>Libellé du critère {index + 1}</Label>
          <Input
            id={`criterion-label-${row.key}`}
            value={row.label}
            onChange={(e) => onChange({ label: e.target.value })}
            required
          />
        </div>
        <div className="w-24 space-y-1">
          <Label htmlFor={`${uid}-weight`}>Points</Label>
          <Input
            id={`${uid}-weight`}
            type="number"
            min={0.5}
            step="0.5"
            value={hasLevels ? String(criterionPoints(row)) : row.weight}
            onChange={(e) => onChange({ weight: e.target.value })}
            readOnly={hasLevels}
            aria-describedby={hasLevels ? `${uid}-weight-hint` : undefined}
            required
          />
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={index === 0}
            onClick={onMoveUp}
            aria-label={`Monter le critère ${index + 1}`}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={index === count - 1}
            onClick={onMoveDown}
            aria-label={`Descendre le critère ${index + 1}`}
          >
            <ArrowDown aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onRemove}
            aria-label={`Supprimer le critère ${index + 1}`}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {axes.length > 0 ? (
          <div className="space-y-1">
            <Label htmlFor={`${uid}-axis`}>Axe du critère {index + 1}</Label>
            <select
              id={`${uid}-axis`}
              value={row.axisKey}
              onChange={(e) => onChange({ axisKey: e.target.value })}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="">Sans axe</option>
              {axes.map((a, i) => (
                <option key={a.key} value={a.key}>
                  {a.label || `Axe ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="min-w-32 flex-1 space-y-1">
          <Label htmlFor={`${uid}-reference`}>Référence du critère {index + 1}</Label>
          <Input
            id={`${uid}-reference`}
            value={row.reference}
            maxLength={200}
            placeholder="Ex. RGAA 1.3.1"
            onChange={(e) => onChange({ reference: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={row.isBonus}
            onChange={(e) => onChange({ isBonus: e.target.checked })}
          />
          Bonus hors barème<span className="sr-only"> (critère {index + 1})</span>
        </label>
      </div>
      {hasLevels ? (
        <p id={`${uid}-weight-hint`} className="text-muted-foreground text-sm">
          Points = palier le plus haut.
        </p>
      ) : null}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Paliers du critère {index + 1}</legend>
        {hasLevels ? (
          <ul className="space-y-2">
            {row.levels.map((level, j) => (
              <li key={level.key} className="flex flex-wrap items-end gap-2">
                <div className="w-24 space-y-1">
                  <Label htmlFor={`level-points-${level.key}`}>
                    Valeur du palier {j + 1} (critère {index + 1})
                  </Label>
                  <Input
                    id={`level-points-${level.key}`}
                    type="number"
                    min={0}
                    step="0.5"
                    value={level.points}
                    onChange={(e) => updateLevel(level.key, { points: e.target.value })}
                    required
                  />
                </div>
                <div className="min-w-48 flex-1 space-y-1">
                  <Label htmlFor={`level-description-${level.key}`}>
                    Description du palier {j + 1} (critère {index + 1})
                  </Label>
                  <Textarea
                    id={`level-description-${level.key}`}
                    rows={2}
                    maxLength={2000}
                    value={level.description}
                    onChange={(e) => updateLevel(level.key, { description: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeLevel(level.key)}
                  aria-label={`Supprimer le palier ${j + 1} du critère ${index + 1}`}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Sans palier, les points se saisissent librement à la correction.
          </p>
        )}
        <Button
          id={`${uid}-add-level`}
          type="button"
          size="sm"
          variant="outline"
          onClick={addLevel}
        >
          <Plus aria-hidden />
          Ajouter un palier
          <span className="sr-only"> au critère {index + 1}</span>
        </Button>
      </fieldset>
      <details>
        <summary className="text-muted-foreground cursor-pointer text-sm">
          Description {row.description ? "" : "(facultative)"}
        </summary>
        <div className="mt-2 space-y-1">
          <Label htmlFor={`${uid}-description`} className="sr-only">
            Description du critère {index + 1}
          </Label>
          <Textarea
            id={`${uid}-description`}
            rows={3}
            maxLength={4000}
            placeholder="Ex. niveaux de notation : 6 pts excellent, 4 pts correct, 0 pt absent…"
            value={row.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
      </details>
    </li>
  );
}
