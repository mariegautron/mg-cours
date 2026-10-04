"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownField } from "@/components/markdown-field";
import {
  addSection,
  BRIEF_MODELS,
  isPlaceholderSection,
  moveSection,
  parseBrief,
  removeSection,
  sectionSummary,
  SECTION_SUGGESTIONS,
  serializeBrief,
  type BriefSection,
} from "@/lib/projects/brief";

interface Row extends BriefSection {
  key: number;
}

/**
 * US-127 : brief du projet en sections libres, dans la mise en page de la maquette : le choix du
 * « genre de projet » (modèle de départ), puis le brief section par section — chaque section se
 * replie en une ligne (titre, résumé, « Rédigé » ou « À rédiger ») et se modifie à part. Envoie le
 * Markdown dans le champ caché `briefMd` (même champ qu'avant).
 */
export function BriefEditor({ initial, error }: { initial: string; error?: string[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    parseBrief(initial).map((s, i) => ({ ...s, key: i })),
  );
  // Les clés des sections ajoutées reprennent après les clés de départ (jamais réutilisées).
  const nextKey = useRef(rows.length);
  const withKeys = (list: BriefSection[]): Row[] =>
    list.map((s) => ({ ...s, key: nextKey.current++ }));
  // Les sections vides (nouvelles) sont ouvertes d'emblée ; les rédigées se replient en une ligne.
  const [opened, setOpened] = useState<Set<number>>(
    () => new Set(rows.filter((r) => !r.body.trim()).map((r) => r.key)),
  );
  const [note, setNote] = useState("");
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const md = serializeBrief(rows);
  const hasText = rows.some((r) => r.body.trim());

  function set(next: Row[], message?: string) {
    setRows(next);
    if (message) setNote(message);
  }

  function open(key: number, on = true) {
    setOpened((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function applyModel(key: string) {
    const model = BRIEF_MODELS.find((m) => m.key === key);
    if (!model) return;
    const next = withKeys(model.sections.map((s) => ({ ...s })));
    set(next, `Modèle « ${model.label} » appliqué.`);
    setOpened(new Set(next.map((r) => r.key)));
    setPendingModel(null);
  }

  function chooseModel(key: string) {
    if (hasText) setPendingModel(key);
    else applyModel(key);
  }

  function focusTitle(index: number) {
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLInputElement>(`[data-section="${index}"] input`)?.focus(),
    );
  }

  function add(title = "") {
    const [row] = withKeys(addSection([], title));
    set([...rows, row], title ? `Section « ${title} » ajoutée.` : "Section ajoutée.");
    open(row.key);
    focusTitle(rows.length);
  }

  const patch = (key: number, p: Partial<BriefSection>) =>
    set(rows.map((r) => (r.key === key ? { ...r, ...p } : r)));

  return (
    <div className="space-y-5">
      <input type="hidden" name="briefMd" value={md} />

      <section aria-labelledby="brief-model" className="bg-card rounded-3xl border p-5 shadow-sm">
        <h2 id="brief-model" className="font-heading mb-1 text-xl font-bold">
          Quel genre de projet ?
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          Un modèle de départ, pas un cadre : tu ajoutes, retires ou renommes les sections comme tu
          veux.
        </p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {BRIEF_MODELS.map((m) => (
            <li key={m.key}>
              <button
                type="button"
                onClick={() => chooseModel(m.key)}
                className="hover:bg-accent focus-visible:ring-ring h-full min-h-11 w-full rounded-xl border p-3 text-left focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="block font-bold">{m.label}</span>
                <span className="text-muted-foreground text-[0.8rem]">{m.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        {pendingModel ? (
          <div
            role="group"
            aria-label="Confirmer le changement de modèle"
            className="mt-3 space-y-2 rounded-xl border p-3"
          >
            <p className="text-sm">
              Le brief contient déjà du texte. Le remplacer par ce modèle ? Tes sections actuelles
              seront perdues.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => applyModel(pendingModel)}>
                Oui, remplacer
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPendingModel(null)}>
                Non, garder mon brief
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="brief-title" className="bg-card rounded-3xl border p-5 shadow-sm">
        <h2 id="brief-title" className="font-heading mb-1 text-xl font-bold">
          Le brief, section par section
        </h2>
        <p id="brief-hint" className="text-muted-foreground mb-2 text-sm">
          C’est ce que les étudiant·es reçoivent. Chaque section se modifie à part : la barre de
          mise en forme et l’aperçu t’évitent d’écrire du Markdown à la main.
        </p>

        {rows.length === 0 ? (
          <p className="text-muted-foreground border-t pt-3 text-sm">
            Aucune section pour l’instant : choisis un modèle ci-dessus, ou ajoute une section.
          </p>
        ) : (
          <ol ref={listRef} aria-labelledby="brief-title">
            {rows.map((s, i) => (
              <li key={s.key} data-section={i} className="border-t py-1">
                <details
                  open={opened.has(s.key)}
                  onToggle={(e) => open(s.key, e.currentTarget.open)}
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <strong>{s.title || "Sans titre"}</strong>
                      {sectionSummary(s.body) && !isPlaceholderSection(s) ? (
                        <div className="text-muted-foreground truncate text-[0.8rem]">
                          {sectionSummary(s.body)}
                        </div>
                      ) : null}
                    </div>
                    <Pill tone={isPlaceholderSection(s) ? "warn" : "ok"}>
                      {isPlaceholderSection(s) ? "À rédiger" : "Rédigé"}
                    </Pill>
                    <span className="text-primary text-sm font-semibold underline underline-offset-2">
                      Modifier<span className="sr-only"> la section {s.title || i + 1}</span>
                    </span>
                  </summary>
                  <div className="space-y-3 pb-3">
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label htmlFor={`sec-title-${s.key}`}>Titre de la section {i + 1}</Label>
                        <Input
                          id={`sec-title-${s.key}`}
                          value={s.title}
                          maxLength={120}
                          onChange={(e) => patch(s.key, { title: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label={`Monter la section « ${s.title || i + 1} »`}
                        disabled={i === 0}
                        onClick={() => {
                          set(moveSection(rows, i, "up"), `Section déplacée en position ${i}.`);
                          focusTitle(i - 1);
                        }}
                        className="hover:bg-muted size-11 rounded-md border disabled:opacity-40"
                      >
                        <ArrowUp aria-hidden className="mx-auto size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Descendre la section « ${s.title || i + 1} »`}
                        disabled={i === rows.length - 1}
                        onClick={() => {
                          set(
                            moveSection(rows, i, "down"),
                            `Section déplacée en position ${i + 2}.`,
                          );
                          focusTitle(i + 1);
                        }}
                        className="hover:bg-muted size-11 rounded-md border disabled:opacity-40"
                      >
                        <ArrowDown aria-hidden className="mx-auto size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Supprimer la section « ${s.title || i + 1} »`}
                        onClick={() => {
                          set(removeSection(rows, i), "Section supprimée.");
                          focusTitle(Math.max(0, i - 1));
                        }}
                        className="hover:bg-muted size-11 rounded-md border"
                      >
                        <Trash2 aria-hidden className="mx-auto size-4" />
                      </button>
                    </div>
                    <MarkdownField
                      id={`sec-body-${s.key}`}
                      label={`Texte de la section ${i + 1}`}
                      value={s.body}
                      rows={6}
                      onChange={(body) => patch(s.key, { body })}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ol>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Button type="button" variant="secondary" onClick={() => add()}>
            Ajouter une section
          </Button>
          {SECTION_SUGGESTIONS.filter((t) => !rows.some((s) => s.title === t)).map((t) => (
            <Button key={t} type="button" variant="outline" onClick={() => add(t)}>
              + {t}
            </Button>
          ))}
        </div>
        <p role="status" aria-live="polite" className="text-muted-foreground mt-2 min-h-5 text-sm">
          {note}
        </p>
        {error?.length ? (
          <p role="alert" className="text-destructive text-sm">
            {error.join(" ")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
