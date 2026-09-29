"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createSkeleton } from "@/app/(app)/modules/[id]/project/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PROJECT_ROLE_LABELS,
  skeletonBalance,
  type ProjectRole,
  type SkeletonItem,
} from "@/lib/ynov/project-skeleton";

interface Row extends SkeletonItem {
  key: number;
  date: string;
}

const SELECT_CLASS = "border-input h-9 rounded-md border bg-transparent px-3 text-sm";

/**
 * US-88 : squelette proposé depuis les notes exigées, entièrement modifiable avant création.
 * Le compteur compare les évaluations du projet (déjà créées + proposées) aux notes YNOV exigées.
 */
export function SkeletonEditor({
  moduleId,
  totalHours,
  proposed,
  existing,
  resetKey,
}: {
  moduleId: string;
  totalHours: number;
  proposed: SkeletonItem[];
  /** Évaluations déjà rattachées au projet (comptent dans le total). */
  existing: { isGroupGrade: boolean }[];
  /** Change quand les évaluations existantes changent : les lignes repartent de `proposed`. */
  resetKey: string;
}) {
  const [state, formAction, pending] = useActionState(createSkeleton.bind(null, moduleId), {});
  const [nextKey, setNextKey] = useState(proposed.length);
  const [rows, setRows] = useState<Row[]>(() =>
    proposed.map((p, i) => ({ ...p, key: i, date: "" })),
  );

  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    // Le message de création (`state`) est conservé : on ne remonte pas le composant.
    setSeenKey(resetKey);
    setNextKey(proposed.length);
    setRows(proposed.map((p, i) => ({ ...p, key: i, date: "" })));
  }

  const balance = skeletonBalance(totalHours, [...existing, ...rows]);
  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const itemsJson = JSON.stringify(
    rows.map(({ role, title, isGroupGrade, date }) => ({ role, title, isGroupGrade, date })),
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="itemsJson" value={itemsJson} />

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Toutes les évaluations du squelette existent déjà. Ajoutez-en si besoin.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, i) => (
            <li key={row.key} className="grid gap-3 rounded-md border p-3 sm:grid-cols-12">
              <div className="space-y-1 sm:col-span-5">
                <Label htmlFor={`title-${row.key}`}>Titre de l’évaluation {i + 1}</Label>
                <Input
                  id={`title-${row.key}`}
                  value={row.title}
                  onChange={(e) => update(row.key, { title: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-3">
                <Label htmlFor={`role-${row.key}`}>Rôle</Label>
                <select
                  id={`role-${row.key}`}
                  className={`${SELECT_CLASS} w-full`}
                  value={row.role}
                  onChange={(e) => {
                    const role = e.target.value as ProjectRole;
                    update(row.key, {
                      role,
                      isGroupGrade:
                        role === "oral" ? true : role === "individual" ? false : row.isGroupGrade,
                    });
                  }}
                >
                  {(Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[]).map((r) => (
                    <option key={r} value={r}>
                      {PROJECT_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor={`date-${row.key}`}>Date</Label>
                <Input
                  id={`date-${row.key}`}
                  type="date"
                  value={row.date}
                  onChange={(e) => update(row.key, { date: e.target.value })}
                />
              </div>
              <div className="flex items-end justify-between gap-2 sm:col-span-2">
                <div className="space-y-1">
                  <Label htmlFor={`kind-${row.key}`}>Note</Label>
                  <select
                    id={`kind-${row.key}`}
                    className={SELECT_CLASS}
                    value={row.isGroupGrade ? "group" : "individual"}
                    onChange={(e) => update(row.key, { isGroupGrade: e.target.value === "group" })}
                  >
                    <option value="group">de groupe</option>
                    <option value="individual">individuelle</option>
                  </select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Retirer l’évaluation ${i + 1} (${row.title || "sans titre"})`}
                  onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p role="status" className="text-sm">
        {balance.proposed.total}/{balance.required.total} notes YNOV exigées (
        {balance.proposed.group} de groupe, {balance.proposed.individual} individuelle
        {balance.proposed.individual > 1 ? "s" : ""}).
        {balance.message ? ` ${balance.message}` : ""}
      </p>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.created ? (
        <p role="status" className="text-sm">
          {state.created} évaluation{state.created > 1 ? "s créées" : " créée"}.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setRows((rs) => [
              ...rs,
              { key: nextKey, role: "milestone", title: "", isGroupGrade: true, date: "" },
            ]);
            setNextKey((k) => k + 1);
          }}
        >
          <Plus aria-hidden />
          Ajouter une évaluation
        </Button>
        <Button type="submit" disabled={pending || rows.length === 0}>
          Créer {rows.length} évaluation{rows.length > 1 ? "s" : ""}
        </Button>
      </div>
    </form>
  );
}
