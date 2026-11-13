"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AgendaItem {
  id: string;
  moduleId: string;
  title: string;
  moduleLabel: string;
  date: string | null;
  groups: string;
  kind: string;
  prepStatus: string;
  prepLabel: string;
  toBuild: boolean;
  gradeCount: number;
  inProgressCount: number;
}

const SELECT = "border-input h-8 rounded-lg border bg-field px-2.5 text-sm";

/**
 * Agenda des évaluations : filtres appliqués tout de suite dans le navigateur (plus de rechargement
 * de toutes les évaluations et de leurs notes à chaque filtre). De la plus proche à la plus
 * lointaine, sans date à la fin, les passées repliées.
 */
export function AgendaList({
  items,
  moduleOptions,
  prepOptions,
  initial,
}: {
  items: AgendaItem[];
  moduleOptions: (readonly [string, string])[];
  prepOptions: (readonly [string, string])[];
  initial: {
    module: string;
    type: string;
    sujet: string;
    du: string;
    au: string;
    toGrade: boolean;
  };
}) {
  const [f, setF] = useState(initial);
  // L'adresse suit les filtres (sans recharger) : « Retour » et un lien partagé les retrouvent.
  useEffect(() => {
    const params = new URLSearchParams();
    if (f.toGrade) params.set("filtre", "a-noter");
    if (f.module) params.set("module", f.module);
    if (f.type) params.set("type", f.type);
    if (f.sujet) params.set("sujet", f.sujet);
    if (f.du) params.set("du", f.du);
    if (f.au) params.set("au", f.au);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (url !== window.location.pathname + window.location.search)
      window.history.replaceState(window.history.state, "", url);
  }, [f]);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const todayIso = new Date().toISOString().slice(0, 10);

  const { upcoming, past } = useMemo(() => {
    const shown = items.filter(
      (a) =>
        (!f.toGrade || a.gradeCount === 0) &&
        (!f.module || a.moduleId === f.module) &&
        (!f.type || a.kind === f.type) &&
        (!f.sujet || a.prepStatus === f.sujet) &&
        (!f.du || (a.date ?? "") >= f.du) &&
        (!f.au || (a.date !== null && a.date <= f.au)),
    );
    return {
      upcoming: shown
        .filter((a) => !a.date || a.date.slice(0, 10) >= todayIso)
        .sort((x, y) => (x.date ?? "9999").localeCompare(y.date ?? "9999")),
      past: shown
        .filter((a) => a.date && a.date.slice(0, 10) < todayIso)
        .sort((x, y) => (y.date ?? "").localeCompare(x.date ?? "")),
    };
  }, [items, f, todayIso]);

  const row = (a: AgendaItem) => (
    <li key={a.id}>
      <Link
        href={`/modules/${a.moduleId}/assessments/${a.id}`}
        className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
      >
        <div>
          <p className="font-medium">{a.title}</p>
          <p className="text-muted-foreground text-sm">
            <strong className="text-foreground">{a.moduleLabel}</strong>
            {a.date ? ` · ${new Date(a.date).toLocaleDateString("fr-FR")}` : ""} · {a.groups || "—"}
          </p>
        </div>
        <span className="flex flex-wrap gap-1.5">
          <Badge variant={a.toBuild ? "outline" : "secondary"}>Sujet : {a.prepLabel}</Badge>
          <Badge variant={a.gradeCount > 0 && a.inProgressCount === 0 ? "secondary" : "outline"}>
            {a.inProgressCount > 0 ? "en cours" : a.gradeCount > 0 ? "notée" : "à noter"}
          </Badge>
        </span>
      </Link>
    </li>
  );

  return (
    <div className="space-y-4">
      <div
        role="search"
        aria-label="Filtrer les évaluations"
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1">
          <Label htmlFor="f-module">Module</Label>
          <select
            id="f-module"
            value={f.module}
            onChange={(e) => set("module")(e.target.value)}
            className={SELECT}
          >
            <option value="">Tous</option>
            {moduleOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-type">Type</Label>
          <select
            id="f-type"
            value={f.type}
            onChange={(e) => set("type")(e.target.value)}
            className={SELECT}
          >
            <option value="">Tous</option>
            <option value="delivery">Rendu de fichiers ou de liens</option>
            <option value="open_questions">Questions ouvertes</option>
            <option value="quiz">QCM</option>
            <option value="oral">Oral</option>
            <option value="checkpoint">Point d’étape</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-sujet">État du sujet</Label>
          <select
            id="f-sujet"
            value={f.sujet}
            onChange={(e) => set("sujet")(e.target.value)}
            className={SELECT}
          >
            <option value="">Tous</option>
            {prepOptions.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-du">Du</Label>
          <Input id="f-du" type="date" value={f.du} onChange={(e) => set("du")(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-au">Au</Label>
          <Input id="f-au" type="date" value={f.au} onChange={(e) => set("au")(e.target.value)} />
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setF({ module: "", type: "", sujet: "", du: "", au: "", toGrade: false })}
        >
          Effacer
        </Button>
      </div>
      <p role="status" className="text-muted-foreground text-[0.8125rem]">
        {upcoming.length + past.length} évaluation{upcoming.length + past.length > 1 ? "s" : ""}
      </p>
      {upcoming.length ? <ul className="space-y-2">{upcoming.map(row)}</ul> : null}
      {past.length ? (
        <details>
          <summary className="text-muted-foreground min-h-11 cursor-pointer py-2 text-sm font-medium">
            {past.length} évaluation{past.length > 1 ? "s" : ""} passée{past.length > 1 ? "s" : ""}
          </summary>
          <ul className="space-y-2">{past.map(row)}</ul>
        </details>
      ) : null}
    </div>
  );
}
