"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setCourseSections } from "@/app/(app)/modules/[id]/courses/workspace-actions";
import { ActionError } from "@/components/action-error";
import type { CourseSection } from "@/lib/resources/sections";

export interface CoursePartsInfo {
  sections: CourseSection[];
  /** Parties gardées pour la séance ; `null` = tout le cours. */
  selected: string[] | null;
  /** Parties apparues dans le cours depuis le choix. */
  added: string[];
  /** Parties choisies qui n'existent plus (renommées ou supprimées). */
  missing: string[];
}

/** « Tout le cours · Choisir les parties » : une séance ne garde que certaines sections `##`. */
export function CourseParts({
  moduleId,
  courseId,
  resourceId,
  title,
  parts,
}: {
  moduleId: string;
  courseId: string;
  resourceId: string;
  title: string;
  parts: CoursePartsInfo;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(parts.selected ?? parts.sections.map((s) => s.title)),
  );
  const total = parts.sections.length;
  const kept = parts.selected
    ? parts.sections.filter((s) => parts.selected!.includes(s.title))
    : parts.sections;
  const slides = kept.reduce((n, s) => n + s.slides, 0);

  const save = (selected: string[] | null) =>
    start(async () => {
      setError("");
      const res = await setCourseSections(moduleId, courseId, resourceId, selected);
      if (res.error) setError(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <div className="basis-full space-y-1 text-sm">
      <p className="flex flex-wrap items-center gap-x-2">
        <span className="text-muted-foreground">
          {parts.selected
            ? `${kept.length} partie${kept.length > 1 ? "s" : ""} sur ${total} · ${slides} diapo${slides > 1 ? "s" : ""}`
            : "Tout le cours"}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-parts`}
          onClick={() => setOpen((v) => !v)}
          className="text-primary min-h-9 font-semibold underline underline-offset-2"
        >
          Choisir les parties<span className="sr-only"> : {title}</span>
        </button>
      </p>
      {parts.added.map((t) => (
        <p
          key={t}
          role="status"
          className="text-sun flex flex-wrap items-center gap-2 font-semibold"
        >
          Le cours a une nouvelle partie : « {t} ».
          <button
            type="button"
            disabled={pending}
            onClick={() => save([...(parts.selected ?? []), t])}
            className="underline underline-offset-2"
          >
            L’ajouter
          </button>
        </p>
      ))}
      {parts.missing.map((t) => (
        <p key={t} role="status" className="text-destructive font-semibold">
          La partie « {t} » n’existe plus dans le cours (renommée ou supprimée) : choisis à nouveau
          les parties.
        </p>
      ))}
      {open ? (
        <fieldset id={`${id}-parts`} className="bg-card space-y-1 rounded-xl border p-3">
          <legend className="px-1 font-semibold">Parties de « {title} » pour cette séance</legend>
          {parts.sections.map((s, i) => (
            <label key={`${s.title}-${i}`} className="flex min-h-9 items-center gap-2">
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={checked.has(s.title)}
                onChange={(e) =>
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(s.title);
                    else next.delete(s.title);
                    return next;
                  })
                }
              />
              <span className="flex-1">{s.title}</span>
              <span className="text-muted-foreground text-xs">
                {s.slides} diapo{s.slides > 1 ? "s" : ""}
              </span>
            </label>
          ))}
          <p className="text-muted-foreground text-xs">
            Le cours reste une seule ressource : une correction arrive dans toutes les séances.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={pending || checked.size === 0}
              onClick={() =>
                save(
                  checked.size === total
                    ? null
                    : parts.sections.map((s) => s.title).filter((t) => checked.has(t)),
                )
              }
              className="bg-primary text-primary-foreground min-h-11 rounded-xl px-4 font-semibold disabled:opacity-50"
            >
              {pending ? "Enregistrement…" : "Garder ces parties"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => save(null)}
              className="hover:bg-accent min-h-11 rounded-xl border px-4 font-semibold"
            >
              Tout le cours
            </button>
          </div>
          {error ? <ActionError error={error} /> : null}
        </fieldset>
      ) : null}
    </div>
  );
}
