"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { ActionError } from "@/components/action-error";
import { saveThemes } from "@/app/(app)/modules/[id]/project/actions";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  groupsByTheme = {},
}: {
  moduleId: string;
  initial: { id: string; title: string; description_md: string }[];
  /** Noms des groupes affectés à chaque thème (identifiant du thème → noms). */
  groupsByTheme?: Record<string, string[]>;
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

  const [selected, setSelected] = useState(0);
  const current = rows[Math.min(selected, rows.length - 1)] ?? null;
  const currentIndex = current ? rows.indexOf(current) : -1;
  const firstLine = (md: string) =>
    md
      .split("\n")
      .find((l) => l.trim())
      ?.trim() ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="themesJson" value={themesJson} />
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun thème : tous les groupes font le même sujet.
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-4 lg:flex-nowrap">
          <div className="w-full min-w-0 space-y-2 lg:w-[20rem] lg:flex-none">
            <p className="text-muted-foreground text-sm">
              {rows.length} thème{rows.length > 1 ? "s" : ""}. Clique un thème pour voir et modifier
              son détail.
            </p>
            <ul className="space-y-1.5">
              {rows.map((row, i) => {
                const groups = row.id ? (groupsByTheme[row.id] ?? []) : [];
                return (
                  <li key={row.key}>
                    <button
                      type="button"
                      aria-pressed={i === currentIndex}
                      onClick={() => setSelected(i)}
                      className={cn(
                        "focus-visible:ring-ring min-h-14 w-full rounded-xl border p-3 text-left focus-visible:ring-2 focus-visible:outline-none",
                        i === currentIndex ? "bg-accent border-primary" : "hover:bg-accent/60",
                      )}
                    >
                      <span className="block font-bold">
                        {row.title.trim() || "Thème sans titre"}
                      </span>
                      {firstLine(row.descriptionMd) ? (
                        <span className="text-muted-foreground block truncate text-sm">
                          {firstLine(row.descriptionMd)}
                        </span>
                      ) : null}
                      <span className="text-muted-foreground block text-xs">
                        {groups.length} groupe{groups.length > 1 ? "s" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {current ? (
            <div className="bg-muted/30 w-full min-w-0 flex-1 space-y-3 rounded-2xl border p-4">
              <h3 className="font-heading text-lg font-bold">
                Détail du thème : {current.title.trim() || "sans titre"}
              </h3>
              <div className="space-y-1">
                <Label htmlFor={`theme-title-${current.key}`}>
                  Titre du thème {currentIndex + 1}
                </Label>
                <Input
                  id={`theme-title-${current.key}`}
                  value={current.title}
                  onChange={(e) => update(current.key, { title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`theme-desc-${current.key}`}>
                  Description du thème {currentIndex + 1} (Markdown)
                </Label>
                <p className="text-muted-foreground text-sm">
                  Le brief de ce thème : ce que les groupes reçoivent en plus du commun.
                </p>
                <Textarea
                  id={`theme-desc-${current.key}`}
                  rows={5}
                  maxLength={20000}
                  value={current.descriptionMd}
                  onChange={(e) => update(current.key, { descriptionMd: e.target.value })}
                />
              </div>
              <p className="text-sm">
                <strong>Groupes sur ce thème :</strong>{" "}
                {current.id && (groupsByTheme[current.id] ?? []).length
                  ? (groupsByTheme[current.id] ?? []).join(", ")
                  : "aucun pour l’instant (voir « Affectation des thèmes »)"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" asChild>
                  <Link href={`/modules/${moduleId}/frise`}>
                    Voir ce que voient les étudiant·es
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Retirer ce thème : ${current.title.trim() || "sans titre"}`}
                  onClick={() => {
                    setRows((rs) => rs.filter((r) => r.key !== current.key));
                    setSelected(Math.max(0, currentIndex - 1));
                  }}
                >
                  <Trash2 aria-hidden />
                  Retirer ce thème
                </Button>
              </div>
            </div>
          ) : null}
        </div>
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
            setSelected(rows.length);
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
