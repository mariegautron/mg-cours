"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addSection,
  BRIEF_MODELS,
  isBriefEmpty,
  moveSection,
  parseBrief,
  removeSection,
  SECTION_SUGGESTIONS,
  serializeBrief,
  type BriefSection,
} from "@/lib/projects/brief";

/**
 * US-127 : brief du projet en sections libres (titre + texte), ajoutables et déplaçables, avec trois
 * modèles de départ. Envoie le Markdown dans le champ caché `briefMd` (même champ qu'avant).
 */
export function BriefEditor({ initial, error }: { initial: string; error?: string[] }) {
  const [sections, setSections] = useState<BriefSection[]>(() => parseBrief(initial));
  const [choosing, setChoosing] = useState(() => isBriefEmpty(initial));
  const [note, setNote] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const md = serializeBrief(sections);

  function set(next: BriefSection[], message?: string) {
    setSections(next);
    if (message) setNote(message);
  }

  function applyModel(key: string) {
    const model = BRIEF_MODELS.find((m) => m.key === key);
    if (!model) return;
    set(
      model.sections.map((s) => ({ ...s })),
      `Modèle « ${model.label} » appliqué.`,
    );
    setChoosing(false);
  }

  function focusTitle(index: number) {
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLInputElement>(`[data-section="${index}"] input`)?.focus(),
    );
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="briefMd" value={md} />
      <div>
        <h3 id="brief-title" className="font-medium">
          Brief du projet
        </h3>
        <p id="brief-hint" className="text-muted-foreground text-sm">
          Des sections libres : un titre et un texte (Markdown : listes, **gras**). Tu les ajoutes,
          les renommes et les déplaces.
        </p>
      </div>

      {choosing ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Par quoi commencer ?</legend>
          <ul className="grid gap-2 sm:grid-cols-3">
            {BRIEF_MODELS.map((m) => (
              <li key={m.key}>
                <button
                  type="button"
                  onClick={() => applyModel(m.key)}
                  className="hover:bg-accent focus-visible:ring-ring h-full w-full rounded-lg border p-3 text-left focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="block font-medium">{m.label}</span>
                  <span className="text-muted-foreground text-sm">{m.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : (
        <>
          <ol ref={listRef} aria-labelledby="brief-title" className="space-y-3">
            {sections.map((s, i) => (
              <li key={i} data-section={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor={`sec-title-${i}`}>Titre de la section {i + 1}</Label>
                    <Input
                      id={`sec-title-${i}`}
                      value={s.title}
                      maxLength={120}
                      onChange={(e) =>
                        set(sections.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={`Monter la section « ${s.title || i + 1} »`}
                    disabled={i === 0}
                    onClick={() => {
                      set(moveSection(sections, i, "up"), `Section déplacée en position ${i}.`);
                      focusTitle(i - 1);
                    }}
                    className="hover:bg-muted size-11 rounded-md border disabled:opacity-40"
                  >
                    <ArrowUp aria-hidden className="mx-auto size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Descendre la section « ${s.title || i + 1} »`}
                    disabled={i === sections.length - 1}
                    onClick={() => {
                      set(
                        moveSection(sections, i, "down"),
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
                      set(removeSection(sections, i), "Section supprimée.");
                      focusTitle(Math.max(0, i - 1));
                    }}
                    className="hover:bg-muted size-11 rounded-md border"
                  >
                    <Trash2 aria-hidden className="mx-auto size-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`sec-body-${i}`}>Texte de la section {i + 1}</Label>
                  <Textarea
                    id={`sec-body-${i}`}
                    rows={4}
                    value={s.body}
                    onChange={(e) =>
                      set(sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))
                    }
                  />
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                set(addSection(sections), "Section ajoutée.");
                focusTitle(sections.length);
              }}
            >
              Ajouter une section
            </Button>
            {SECTION_SUGGESTIONS.filter((t) => !sections.some((s) => s.title === t)).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  set(addSection(sections, t), `Section « ${t} » ajoutée.`);
                  focusTitle(sections.length);
                }}
              >
                + {t}
              </Button>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => setChoosing(true)}>
              Repartir d’un modèle
            </Button>
          </div>
        </>
      )}
      <p role="status" aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
        {note}
      </p>
      {error?.length ? (
        <p role="alert" className="text-destructive text-sm">
          {error.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
