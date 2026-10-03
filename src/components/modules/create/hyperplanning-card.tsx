"use client";

import { useId, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";

import { readHyperplanning } from "@/app/(app)/modules/hyperplanning-actions";
import { Pill } from "@/components/dashboard/pill";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { ErrorBox, StatusStep } from "@/components/modules/create/status-step";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/modules/course-duration";
import { matchServices, type HyperplanningService } from "@/lib/modules/hyperplanning";
import { failure } from "@/lib/messages";

export interface HyperplanningRead {
  file: string;
  services: HyperplanningService[];
  warnings: string[];
  matched: boolean;
}

/**
 * Carte « Export Hyperplanning de l'école » : lecture du PDF « Services par intervenant », choix de
 * la matière quand le nom ne suffit pas. Les séances qui en sortent sont montrées à l'étape 2.
 */
export function HyperplanningCard({
  read,
  chosen,
  onRead,
  onChoose,
  onReset,
  getModuleName,
}: {
  read: HyperplanningRead | null;
  chosen: number | null;
  onRead: (read: HyperplanningRead) => void;
  onChoose: (index: number) => void;
  onReset: () => void;
  getModuleName: () => string;
}) {
  const id = useId();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);

  async function readFile(file: File, input: HTMLInputElement) {
    input.value = "";
    setPending(file.name);
    setError("");
    const formData = new FormData();
    formData.set("file", file);
    const result = await readHyperplanning(formData);
    setPending(null);
    if (result.error || !result.services) {
      return setError(result.error ?? failure("lire le fichier"));
    }
    const found = matchServices(result.services, getModuleName());
    onRead({
      file: file.name,
      services: result.services,
      warnings: result.warnings ?? [],
      matched: found.length > 0,
    });
    setTimeout(() => titleRef.current?.focus(), 0);
  }

  const candidates = useMemo(() => {
    if (!read) return [];
    const found = matchServices(read.services, getModuleName());
    return found.length ? found : read.services;
    // Le nom est relu à chaque lecture de fichier, pas à chaque frappe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [read]);

  const service = read && chosen !== null ? read.services[chosen] : null;
  const needsChoice = !!read && (candidates.length > 1 || !read.matched);

  return (
    <section aria-labelledby={`${id}-title`} className="bg-card rounded-3xl border p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="font-heading text-xl font-bold">
          Export Hyperplanning de l’école
        </h2>
        {service ? <Pill tone="ok">Module retrouvé</Pill> : null}
        {pending ? <Pill tone="wip">Lecture en cours</Pill> : null}
        {read && !service ? <Pill tone="warn">À choisir</Pill> : null}
      </div>
      <p className="text-muted-foreground mt-1.5 mb-3.5 text-sm">
        « Services par intervenant » : je retrouve ton module et ses créneaux.
      </p>

      {pending ? (
        <div role="status" aria-label="Lecture de l’export">
          <ul>
            <StatusStep state="running" title="Lecture de l’export" detail={pending} />
            <StatusStep state="todo" title="Recherche de ton module" />
          </ul>
        </div>
      ) : null}

      {!read && !pending ? (
        <div className="space-y-3">
          <FileDropZone
            id={`${id}-file`}
            name=""
            label="Export Hyperplanning (PDF, 4 Mo max)"
            hint="lecture immédiate, le fichier n’est pas conservé"
            accept=".pdf"
            onFile={(file, input) => void readFile(file, input)}
          />
          {error ? (
            <ErrorBox title="Cet export n’a pas pu être lu.">{error}</ErrorBox>
          ) : (
            <p className="text-muted-foreground text-sm">
              Pas d’export sous la main ? Passe cette étape : tu saisiras le planning à la main.
            </p>
          )}
        </div>
      ) : null}

      {read ? (
        <div className="space-y-3 text-sm">
          <div className="bg-muted/40 flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-3">
            <FileText aria-hidden className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{read.file}</span>
            <Button type="button" variant="ghost" onClick={onReset}>
              Remplacer
            </Button>
          </div>

          <h3 ref={titleRef} tabIndex={-1} className="font-medium outline-none">
            {service && !needsChoice
              ? `Matière trouvée : ${service.name}`
              : read.matched
                ? "Plusieurs blocs portent le nom de ce module : choisis le bon"
                : "Aucune matière ne porte le nom de ce module : choisis-la dans la liste"}
          </h3>

          {needsChoice ? (
            <fieldset className="space-y-1">
              <legend className="sr-only">Matière à importer</legend>
              {candidates.map((s) => {
                const index = read.services.indexOf(s);
                return (
                  <label key={index} className="flex min-h-11 items-start gap-2 py-1">
                    <input
                      type="radio"
                      name={`${id}-service`}
                      checked={chosen === index}
                      onChange={() => onChoose(index)}
                      className="mt-1"
                    />
                    <span>
                      <strong>{s.name}</strong> · {s.audience}
                      {s.totalHours ? ` · ${formatDuration(s.totalHours)}` : ""} · {s.slots.length}{" "}
                      créneau{s.slots.length > 1 ? "x" : ""}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : null}

          {service ? (
            <p>
              Trouvé : <strong>{service.name}</strong> · {service.audience}
              {service.totalHours ? ` · ${formatDuration(service.totalHours)}` : ""} ·{" "}
              {service.slots.length} créneau{service.slots.length > 1 ? "x" : ""} lu
              {service.slots.length > 1 ? "s" : ""}.
            </p>
          ) : null}

          {read.warnings.map((w) => (
            <ErrorBox key={w} title={w} tone="sun" />
          ))}
        </div>
      ) : null}
    </section>
  );
}
