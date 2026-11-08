"use client";

import { useState } from "react";

import {
  applyOralProposal,
  routeOralNotes,
  validateOralText,
  type RouteResult,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/oral/space-actions";
import type { useVersionedFields } from "@/components/assessments/use-oral-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { OralCriterion } from "@/lib/assessments/oral-space";
import {
  findNames,
  hashText,
  ROUTE_LABELS,
  proposeText,
  routeNotes,
  TEXT_STATE_LABELS,
  textFields,
  textState,
  type NoteLine,
  type RouteDest,
  type Segment,
  type StoredTextState,
} from "@/lib/assessments/oral-texts";
import { cn } from "@/lib/utils";

type Fields = ReturnType<typeof useVersionedFields>;

export interface TextMeta {
  text: string;
  state: StoredTextState;
  hash: string | null;
  letter: string | null;
  sources: Segment[];
}

const STATE_TONE: Record<string, string> = {
  empty: "border-muted-foreground/40 text-muted-foreground",
  proposed: "border-sky/60 text-sky",
  to_validate: "border-sun/60 text-sun",
  to_review: "border-coral/60 text-coral",
  validated: "border-mint/60 text-mint",
};

/**
 * Les textes d'un oral : un par critère, points forts, axes de progrès et commentaire global.
 * Chaque texte est écrit par Marie ou proposé par gabarit, puis validé un par un. Un prénom du
 * module dans un texte de groupe empêche la validation.
 */
export function OralTextsPanel({
  moduleId,
  assessmentId,
  subjectId,
  isGroup,
  criteria,
  letters,
  fields,
  initialMeta,
  moduleNames,
  members,
  criterionNotes,
  pad,
  readOnly,
}: {
  moduleId: string;
  assessmentId: string;
  subjectId: string;
  isGroup: boolean;
  criteria: OralCriterion[];
  letters: Record<string, string>;
  fields: Fields;
  initialMeta: Record<string, TextMeta>;
  moduleNames: string[];
  members: { id: string; name: string }[];
  criterionNotes: Record<string, string>;
  pad: string;
  readOnly: boolean;
}) {
  const [meta, setMeta] = useState<Record<string, TextMeta>>(initialMeta);
  const [message, setMessage] = useState<Record<string, string>>({});
  const list = textFields(criteria);
  const textOf = (id: string) => fields.values[`text:${id}`] ?? "";

  const entryOf = (id: string) => {
    const m = meta[id];
    const text = textOf(id);
    if (!m) return { text, state: "to_validate" as const, hash: null, letter: null, sources: [] };
    // Une proposition modifiée à la main devient « à valider ».
    const state = m.state === "proposed" && text !== m.text ? "to_validate" : m.state;
    return { ...m, text, state };
  };
  const stateOf = (id: string, letter?: string) => textState(entryOf(id), letter);
  const validatedCount = list.filter(
    (x) => stateOf(x.id, x.criterionId ? letters[x.criterionId] : undefined) === "validated",
  ).length;

  async function propose(id: string) {
    const field = list.find((x) => x.id === id);
    if (!field) return;
    const current = textOf(id);
    const proposal = proposeText(field, { criteria, letters, criterionNotes, pad });
    if (proposal.text === "") {
      setMessage((m) => ({ ...m, [id]: "Rien à proposer : pose d’abord les lettres concernées." }));
      return;
    }
    const overwrite =
      current.trim() === "" ||
      meta[id]?.state === "proposed" ||
      window.confirm("Remplacer le texte déjà écrit par la proposition ?");
    if (!overwrite) return;
    await fields.flush();
    const res = await applyOralProposal(moduleId, assessmentId, subjectId, id, proposal, true);
    if (res.error) return setMessage((m) => ({ ...m, [id]: res.error ?? "" }));
    fields.adopt(`text:${id}`, proposal.text);
    setMeta((prev) => ({
      ...prev,
      [id]: {
        text: proposal.text,
        state: "proposed",
        hash: null,
        letter: null,
        sources: proposal.segments,
      },
    }));
    setMessage((m) => ({ ...m, [id]: "" }));
  }

  async function validate(id: string, letter?: string) {
    await fields.flush();
    const res = await validateOralText(moduleId, assessmentId, subjectId, id);
    if (res.error) return setMessage((m) => ({ ...m, [id]: res.error ?? "" }));
    const text = textOf(id).trim();
    setMeta((prev) => ({
      ...prev,
      [id]: {
        text,
        state: "validated",
        hash: hashText(text),
        letter: letter || null,
        sources: prev[id]?.sources ?? [],
      },
    }));
    setMessage((m) => ({ ...m, [id]: "" }));
  }

  return (
    <section
      aria-labelledby={`texts-${subjectId}`}
      className="bg-card space-y-3 rounded-2xl border p-4"
    >
      <h4
        id={`texts-${subjectId}`}
        tabIndex={-1}
        className="font-heading text-lg font-bold outline-none"
      >
        Textes à valider : {validatedCount} sur {list.length}
      </h4>
      <p className="text-muted-foreground text-sm">
        {isGroup ? "Au vouvoiement, sans prénom. " : ""}Chaque texte est écrit ou proposé, puis
        validé un par un. « Écrire la note » n’enregistre que les textes validés.
      </p>
      {list.map((field) => {
        const letter = field.criterionId ? letters[field.criterionId] : undefined;
        const state = stateOf(field.id, letter);
        const text = textOf(field.id);
        const hits = isGroup ? findNames(text, moduleNames) : [];
        const sources = meta[field.id]?.sources ?? [];
        return (
          <div key={field.id} className="space-y-1 border-t pt-2 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={`txt-${subjectId}-${field.id}`} className="font-medium">
                {field.label}
                {field.criterionId ? ` (lettre ${letter || "à poser"})` : ""}
              </label>
              <span
                className={cn("rounded-full border px-2.5 text-xs font-bold", STATE_TONE[state])}
              >
                {TEXT_STATE_LABELS[state]}
              </span>
            </div>
            <Textarea
              id={`txt-${subjectId}-${field.id}`}
              rows={3}
              disabled={readOnly}
              value={text}
              onChange={(e) => fields.set(`text:${field.id}`, e.target.value)}
            />
            {hits.length > 0 ? (
              <p role="alert" className="text-destructive text-sm">
                Prénom dans un texte de groupe :{" "}
                {text.split("").length > 0
                  ? (() => {
                      const parts: React.ReactNode[] = [];
                      let at = 0;
                      hits.forEach((h, i) => {
                        parts.push(text.slice(at, h.start));
                        parts.push(
                          <mark key={i} className="bg-sun/40 rounded px-0.5">
                            {text.slice(h.start, h.end)}
                          </mark>,
                        );
                        at = h.end;
                      });
                      parts.push(text.slice(at));
                      return parts;
                    })()
                  : null}
              </p>
            ) : null}
            {`text:${field.id}` in fields.conflicts ? (
              <div
                role="alert"
                className="border-sun/60 bg-sun/10 space-y-1 rounded-lg border p-2 text-sm"
              >
                <p>Ici : {text || "(vide)"}</p>
                <p>Ailleurs : {fields.conflicts[`text:${field.id}`] || "(vide)"}</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fields.keepMine(`text:${field.id}`)}
                  >
                    Garder la mienne
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fields.takeTheirs(`text:${field.id}`)}
                  >
                    Prendre l’autre
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={readOnly}
                onClick={() => void propose(field.id)}
              >
                Proposer
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  readOnly || text.trim() === "" || hits.length > 0 || state === "validated"
                }
                onClick={() => void validate(field.id, letter)}
              >
                {state === "validated" ? "Validé" : "Valider"}
              </Button>
              {state === "to_review" ? (
                <span className="text-coral text-xs">
                  Le texte ou la lettre a changé depuis la validation.
                </span>
              ) : null}
            </div>
            {sources.length > 0 ? (
              <details className="text-sm">
                <summary className="cursor-pointer">D’où vient cette proposition ?</summary>
                <ul className="text-muted-foreground list-disc pl-5">
                  {sources.map((s, i) => (
                    <li key={i}>
                      {s.text ? <span className="text-foreground">{s.text} </span> : null}
                      <span>— {s.source}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {message[field.id] ? (
              <p role="alert" className="text-destructive text-sm">
                {message[field.id]}
              </p>
            ) : null}
          </div>
        );
      })}
      {isGroup && members.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Les commentaires personnels (au tutoiement) se créent avec « Répartir mes notes ».
        </p>
      ) : null}
    </section>
  );
}

/** Répartir mes notes : une destination proposée pour chaque note, rien n'est déplacé avant ta validation. */
export function OralRoutePanel({
  moduleId,
  assessmentId,
  subjectId,
  criteria,
  members,
  criterionNotes,
  personNotes,
  pad,
  routed,
  isGroup,
}: {
  moduleId: string;
  assessmentId: string;
  subjectId: string;
  criteria: OralCriterion[];
  members: { id: string; name: string }[];
  criterionNotes: Record<string, string>;
  personNotes: Record<string, string>;
  pad: string;
  routed: Record<string, { dest: string; at: string }>;
  isGroup: boolean;
}) {
  const [done, setDone] = useState<Record<string, { dest: string; at: string }>>(routed);
  const lines = routeNotes(
    {
      criteria,
      criterionNotes,
      personNotes,
      pad,
      members: members.map((m) => ({ id: m.id, firstName: m.name.split(" ")[0], name: m.name })),
    },
    done,
  );
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [dests, setDests] = useState<Record<string, RouteDest>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RouteResult | null>(null);
  const [busy, setBusy] = useState(false);

  const destOf = (l: NoteLine) => dests[l.key] ?? l.dest;
  const textOfLine = (l: NoteLine) => texts[l.key] ?? l.rewritten;
  // Une remarque sur une personne ne va jamais vers un texte de groupe.
  const aboutPerson = (l: NoteLine) =>
    l.origin.kind === "person" || l.dest === "person" || (l.dest === "notebook" && !!l.target);
  const allowed = (l: NoteLine): RouteDest[] =>
    aboutPerson(l)
      ? ["person", "notebook", "nowhere"]
      : ["criterion", "person", "notebook", "nowhere"];
  const selected = lines.filter((l) => picked[l.key]);

  async function run() {
    setBusy(true);
    const res = await routeOralNotes(
      moduleId,
      assessmentId,
      subjectId,
      selected.map((l) => {
        const dest = destOf(l);
        const target =
          dest === "criterion"
            ? l.origin.kind === "criterion"
              ? l.origin.id
              : l.dest === "criterion"
                ? l.target
                : criteria[0]?.id
            : (l.target ?? (dest === "person" ? members[0]?.id : undefined));
        return { key: l.key, dest, target, text: dest === "notebook" ? l.text : textOfLine(l) };
      }),
    );
    setBusy(false);
    setResult(res);
    if (res.done.length > 0)
      setDone((prev) => ({
        ...prev,
        ...Object.fromEntries(
          res.done.map((k) => [
            k,
            { dest: destOf(lines.find((l) => l.key === k)!), at: new Date().toISOString() },
          ]),
        ),
      }));
  }

  return (
    <section
      aria-labelledby={`route-${subjectId}`}
      className="bg-card space-y-3 rounded-2xl border p-4"
    >
      <h4
        id={`route-${subjectId}`}
        tabIndex={-1}
        className="font-heading text-lg font-bold outline-none"
      >
        Répartir mes notes
      </h4>
      <p className="text-muted-foreground text-sm">
        Une destination est proposée pour chaque note. Coche les lignes à déplacer, corrige si
        besoin, puis valide. La note d’origine reste dans ton bloc-notes, marquée « répartie ».
        {isGroup ? " Une remarque sur une personne ne va jamais vers un texte du groupe." : ""}
      </p>
      {lines.length === 0 ? <p className="text-sm">Aucune note à répartir.</p> : null}
      <ul className="space-y-2">
        {lines.map((l) => (
          <li key={l.key} className="space-y-1 rounded-lg border p-2 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={!!picked[l.key]}
                onChange={(e) => setPicked((p) => ({ ...p, [l.key]: e.target.checked }))}
              />
              <span>
                <span className="text-muted-foreground block text-xs">
                  {l.origin.kind === "pad"
                    ? "Bloc-notes"
                    : l.origin.kind === "criterion"
                      ? "Notes du critère"
                      : "Notes de la personne"}
                </span>
                {l.text}
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Destination"
                value={destOf(l)}
                onChange={(e) => setDests((d) => ({ ...d, [l.key]: e.target.value as RouteDest }))}
                className="border-input bg-background min-h-9 rounded-md border px-2"
              >
                {allowed(l).map((d) => (
                  <option key={d} value={d}>
                    {ROUTE_LABELS[d]}
                  </option>
                ))}
              </select>
              {destOf(l) === "criterion" || destOf(l) === "person" ? (
                <Textarea
                  aria-label="Reformulation"
                  rows={2}
                  className="min-w-60 flex-1"
                  value={textOfLine(l)}
                  onChange={(e) => setTexts((t) => ({ ...t, [l.key]: e.target.value }))}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {Object.keys(done).length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {Object.keys(done).length} note(s) déjà répartie(s).
        </p>
      ) : null}
      <Button type="button" disabled={busy || selected.length === 0} onClick={() => void run()}>
        {busy
          ? "Répartition…"
          : `Répartir ${selected.length} note${selected.length > 1 ? "s" : ""}`}
      </Button>
      {result ? (
        <div role="status" className="space-y-1 text-sm">
          {result.error ? <p className="text-destructive">{result.error}</p> : null}
          {result.done.length > 0 ? (
            <p>{result.done.length} note(s) répartie(s) : les textes déplacés restent à valider.</p>
          ) : null}
          {result.failed.map((f) => (
            <p key={f.key} className="text-destructive">
              Échec : {f.reason}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
