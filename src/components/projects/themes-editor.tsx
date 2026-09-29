"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { ActionError } from "@/components/action-error";
import { saveThemes } from "@/app/(app)/modules/[id]/project/actions";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Row {
  key: number;
  id: string | null;
  title: string;
  descriptionMd: string;
}

/** US-89 : thèmes au choix du projet (ex. 3 sujets), titre + description Markdown. */
export function ThemesEditor({
  moduleId,
  initial,
}: {
  moduleId: string;
  initial: { id: string; title: string; description_md: string }[];
}) {
  const signature = initial.map((t) => `${t.id}:${t.title}:${t.description_md}`).join("|");
  const [state, formAction, pending] = useActionState(saveThemes.bind(null, moduleId), {});
  const [nextKey, setNextKey] = useState(initial.length);
  const toRows = () =>
    initial.map((t, i) => ({ key: i, id: t.id, title: t.title, descriptionMd: t.description_md }));
  const [rows, setRows] = useState<Row[]>(toRows);
  // Après un enregistrement, les lignes repartent des thèmes enregistrés (avec leurs identifiants) ;
  // le message d'état est conservé : on ne remonte pas le composant.
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setNextKey(initial.length);
    setRows(toRows());
  }

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const themesJson = JSON.stringify(
    rows.map(({ id, title, descriptionMd }) => ({ id, title, descriptionMd })),
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="themesJson" value={themesJson} />
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun thème : tous les groupes font le même sujet.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, i) => (
            <li key={row.key} className="space-y-3 rounded-md border p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor={`theme-title-${row.key}`}>Titre du thème {i + 1}</Label>
                  <Input
                    id={`theme-title-${row.key}`}
                    value={row.title}
                    onChange={(e) => update(row.key, { title: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Retirer le thème ${i + 1} (${row.title || "sans titre"})`}
                  onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`theme-desc-${row.key}`}>
                  Description du thème {i + 1} (Markdown)
                </Label>
                <Textarea
                  id={`theme-desc-${row.key}`}
                  rows={4}
                  maxLength={20000}
                  value={row.descriptionMd}
                  onChange={(e) => update(row.key, { descriptionMd: e.target.value })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {state.error ? <ActionError error={state.error} /> : null}
      {state.saved ? (
        <p role="status" className="text-sm">
          Thèmes enregistrés.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setRows((rs) => [...rs, { key: nextKey, id: null, title: "", descriptionMd: "" }]);
            setNextKey((k) => k + 1);
          }}
        >
          <Plus aria-hidden />
          Ajouter un thème
        </Button>
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer les thèmes
        </PendingButton>
      </div>
    </form>
  );
}
