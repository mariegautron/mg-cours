"use client";

import { seeOthers } from "@/lib/plural";
import { useState } from "react";

import { ObservationItem } from "@/components/notebook/observation-item";
import type { ObservationTag } from "@/lib/notebook/notebook";

export interface JournalObservation {
  id: string;
  tag: ObservationTag;
  note: string | null;
  created_at: string;
  module: { id: string; name: string } | null;
  course: { title: string } | null;
}

const VISIBLE = 3;
/** Au-delà, le texte est coupé à 4 lignes avec « Lire la suite ». */
const LONG_NOTE = 280;

/** Journal d'observations de la fiche : filtre par module, 3 visibles, textes longs repliés. */
export function StudentJournal({
  studentId,
  observations,
}: {
  studentId: string;
  observations: JournalObservation[];
}) {
  const modules = [
    ...new Map(
      observations.flatMap((o) => (o.module ? [[o.module.id, o.module.name] as const] : [])),
    ).entries(),
  ];
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const filtered = moduleId ? observations.filter((o) => o.module?.id === moduleId) : observations;
  const shown = all ? filtered : filtered.slice(0, VISIBLE);

  return (
    <div className="space-y-2">
      {modules.length > 1 ? (
        <div role="group" aria-label="Filtrer par module" className="flex flex-wrap gap-1.5">
          {[[null, "Tous"] as const, ...modules].map(([id, name]) => (
            <button
              key={id ?? "all"}
              type="button"
              aria-pressed={moduleId === id}
              onClick={() => {
                setModuleId(id);
                setAll(false);
              }}
              className="aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:ring-ring min-h-9 rounded-full border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      <ol className="divide-y text-sm">
        {shown.map((o) => {
          const long = (o.note ?? "").length > LONG_NOTE;
          const expanded = open.has(o.id);
          return (
            <li key={o.id} className="py-2">
              <div className={long && !expanded ? "[&_p]:line-clamp-4" : undefined}>
                <ObservationItem
                  id={o.id}
                  studentId={studentId}
                  tag={o.tag}
                  note={o.note}
                  heading={
                    <>
                      <time dateTime={o.created_at} className="font-semibold">
                        {new Date(o.created_at).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Europe/Paris",
                        })}
                      </time>
                      <span className="text-muted-foreground">
                        {[o.module?.name, o.course?.title].filter(Boolean).join(" · ") ||
                          "Séance supprimée"}
                      </span>
                    </>
                  }
                />
              </div>
              {long ? (
                <button
                  type="button"
                  className="text-primary min-h-9 text-sm font-semibold underline underline-offset-2"
                  onClick={() =>
                    setOpen((prev) => {
                      const next = new Set(prev);
                      if (expanded) next.delete(o.id);
                      else next.add(o.id);
                      return next;
                    })
                  }
                >
                  {expanded ? "Replier" : "Lire la suite"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
      {!all && filtered.length > VISIBLE ? (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="text-primary min-h-11 text-sm font-semibold underline underline-offset-2"
        >
          {seeOthers(filtered.length - VISIBLE)}
        </button>
      ) : null}
    </div>
  );
}
