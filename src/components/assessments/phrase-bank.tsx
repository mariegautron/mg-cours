"use client";

import { useEffect, useId, useRef, useState, useTransition, type RefObject } from "react";

import { recordPhraseUse, savePhrase } from "@/app/(app)/assessments/comments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  filterPhrases,
  insertPhrase,
  rankPhrases,
  selectedOrAll,
  type CriterionFilter,
  type Phrase,
} from "@/lib/assessments/phrases";

const VISIBLE = 6;

interface Draft {
  text: string;
  criterionId: string;
  subject: string;
  category: Phrase["category"];
}

/**
 * Phrases réutilisables autour d'un commentaire (US-84) : insertion en un clic au curseur (le texte est
 * COPIÉ, rien n'est lié à la phrase) et « Enregistrer la sélection comme phrase ». Les plus utilisées
 * d'abord, puis celles de la même matière.
 */
export function PhraseBank<T extends Phrase>({
  phrases,
  criteria,
  subject,
  value,
  onValueChange,
  textareaRef,
  label,
  fixedCriterion,
  categories,
}: {
  phrases: T[];
  criteria: { id: string; label: string }[];
  /** Matière courante (ex. nom du module), proposée à l'enregistrement. */
  subject: string | null;
  value: string;
  onValueChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Champ concerné, pour nommer la région (ex. « Points forts »). */
  label?: string;
  /** Phrases d'un seul critère (champ de commentaire d'un critère) : pas de filtre à choisir. */
  fixedCriterion?: { id: string; label: string };
  /** Types de phrases proposés (ex. seulement « positif » pour les points forts). */
  categories?: Phrase["category"][];
}) {
  const uid = useId();
  const [list, setList] = useState<Phrase[]>(() => rankPhrases(phrases, subject));
  const [filterKey, setFilterKey] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();
  const touchedRef = useRef(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const draftTextRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    const onFocus = () => {
      touchedRef.current = true;
    };
    textarea?.addEventListener("focus", onFocus);
    return () => textarea?.removeEventListener("focus", onFocus);
  }, [textareaRef]);

  const filter: CriterionFilter = fixedCriterion
    ? { kind: "criterion", id: fixedCriterion.id, label: fixedCriterion.label }
    : filterKey === "all"
      ? { kind: "all" }
      : filterKey === "general"
        ? { kind: "general" }
        : {
            kind: "criterion",
            id: filterKey,
            label: criteria.find((c) => c.id === filterKey)?.label ?? "",
          };
  const pool = categories ? list.filter((p) => categories.includes(p.category)) : list;
  const matching = filterPhrases(pool, filter);
  const shown = expanded ? matching : matching.slice(0, VISIBLE);

  function insert(phrase: Phrase) {
    const textarea = textareaRef.current;
    // Au curseur si la zone a déjà été utilisée ; sinon à la fin, sur une nouvelle ligne.
    const cursor = textarea && touchedRef.current ? textarea.selectionEnd : null;
    const next = insertPhrase(value, phrase.text, cursor);
    onValueChange(next.value);
    setList((prev) =>
      prev.map((p) => (p.id === phrase.id ? { ...p, use_count: p.use_count + 1 } : p)),
    );
    setAnnouncement("Phrase insérée dans le commentaire.");
    void recordPhraseUse(phrase.id);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  function openSave() {
    const textarea = textareaRef.current;
    const text = textarea
      ? selectedOrAll(value, textarea.selectionStart, textarea.selectionEnd)
      : value.trim();
    setError("");
    setDraft({
      text,
      criterionId:
        fixedCriterion?.id ?? (filterKey !== "all" && filterKey !== "general" ? filterKey : ""),
      subject: subject ?? "",
      category: categories?.[0] ?? "advice",
    });
    requestAnimationFrame(() => draftTextRef.current?.focus());
  }

  function closeSave() {
    setDraft(null);
    requestAnimationFrame(() => saveButtonRef.current?.focus());
  }

  function submit() {
    if (!draft) return;
    startTransition(async () => {
      const result = await savePhrase({
        text: draft.text,
        criterionId: draft.criterionId || null,
        subject: draft.subject,
        category: draft.category,
      });
      if (result.error || !result.phrase) {
        setError(result.error ?? "Enregistrement impossible.");
        return;
      }
      setList((prev) => [result.phrase as Phrase, ...prev]);
      setAnnouncement("Phrase enregistrée.");
      closeSave();
    });
  }

  return (
    <section aria-labelledby={`${uid}-title`} className="space-y-2 rounded-md border p-3">
      <h4 id={`${uid}-title`} className="text-sm font-medium">
        Phrases réutilisables{label ? ` — ${label}` : ""}
      </h4>

      <div className="flex flex-wrap items-end gap-2">
        {fixedCriterion ? null : (
          <div className="space-y-1">
            <Label htmlFor={`${uid}-filter`} className="text-xs">
              Critère
            </Label>
            <select
              id={`${uid}-filter`}
              value={filterKey}
              onChange={(e) => {
                setFilterKey(e.target.value);
                setExpanded(false);
              }}
              className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="all">Toutes</option>
              <option value="general">Générales</option>
              {criteria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <Button ref={saveButtonRef} type="button" size="sm" variant="outline" onClick={openSave}>
          Enregistrer la sélection comme phrase
        </Button>
      </div>

      {shown.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune phrase enregistrée pour ce filtre.</p>
      ) : (
        <ul className="space-y-1">
          {shown.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => insert(p)}
                className="hover:bg-muted focus-visible:ring-ring w-full rounded-md border px-2 py-1 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="sr-only">Insérer : </span>
                {p.text}
                <span className="text-muted-foreground block text-xs">
                  {[
                    p.criterion_label,
                    p.subject,
                    p.use_count > 0 ? `utilisée ${p.use_count} fois` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {matching.length > VISIBLE ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Voir moins" : `Voir les ${matching.length} phrases`}
        </Button>
      ) : null}

      {draft ? (
        <div
          role="group"
          aria-labelledby={`${uid}-new`}
          className="space-y-2 rounded-md border p-3"
        >
          <p id={`${uid}-new`} className="text-sm font-medium">
            Nouvelle phrase
          </p>
          <div className="space-y-1">
            <Label htmlFor={`${uid}-text`}>Texte de la phrase</Label>
            <Textarea
              id={`${uid}-text`}
              ref={draftTextRef}
              rows={2}
              maxLength={1000}
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor={`${uid}-criterion`}>Critère de la phrase</Label>
              <select
                id={`${uid}-criterion`}
                value={draft.criterionId}
                onChange={(e) => setDraft({ ...draft, criterionId: e.target.value })}
                className="border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm"
              >
                <option value="">Générale</option>
                {criteria.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${uid}-subject`}>Matière de la phrase</Label>
              <Input
                id={`${uid}-subject`}
                value={draft.subject}
                maxLength={100}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                onKeyDown={(e) => {
                  // Entrée ne doit pas envoyer le formulaire de note qui contient ce bloc.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${uid}-category`}>Type de phrase</Label>
              <select
                id={`${uid}-category`}
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value as Phrase["category"] })
                }
                className="border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm"
              >
                {(
                  [
                    ["positive", "Positif"],
                    ["advice", "Conseil"],
                    ["negative", "Négatif"],
                  ] as const
                )
                  .filter(([value]) => !categories || categories.includes(value))
                  .map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={submit}>
              {pending ? "Enregistrement…" : "Enregistrer la phrase"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={closeSave}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
