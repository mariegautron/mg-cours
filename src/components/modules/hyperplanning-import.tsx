"use client";

import { useId, useMemo, useRef, useState } from "react";

import { readHyperplanning } from "@/app/(app)/modules/hyperplanning-actions";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/modules/course-duration";
import {
  describeDateChanges,
  matchServices,
  moduleDatesFromSlots,
  slotsToSessions,
  summarizeModuleDates,
  type HyperplanningService,
  type ModuleDates,
  type SlotMode,
} from "@/lib/modules/hyperplanning";
import type { ScheduleRow } from "@/lib/modules/schedule-parser";

const frDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const hours = (s: ScheduleRow) => {
  if (!s.startTime || !s.endTime) return 0;
  const [h1, m1] = s.startTime.split(":").map(Number);
  const [h2, m2] = s.endTime.split(":").map(Number);
  return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
};

/**
 * Import du PDF « Services intervenant » d'Hyperplanning : lecture côté serveur, choix de la
 * matière, aperçu des séances et des dates. Rien n'est écrit tant que le bouton de confirmation
 * n'est pas cliqué ; la confirmation remplit le tableau de créneaux, qui reste à enregistrer.
 */
export function HyperplanningImport({
  getModuleName,
  current,
  existingCount,
  onConfirm,
}: {
  /** Nom du module (champ du formulaire de création, ou module existant). */
  getModuleName: () => string;
  /** Dates déjà enregistrées d'un module existant, pour montrer l'écart. */
  current?: ModuleDates;
  existingCount: number;
  onConfirm: (sessions: ScheduleRow[], dates: ModuleDates, service: HyperplanningService) => void;
}) {
  const id = useId();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<{
    services: HyperplanningService[];
    warnings: string[];
    matched: boolean;
  } | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [mode, setMode] = useState<SlotMode>("merge");
  const previewRef = useRef<HTMLHeadingElement>(null);

  async function read(file: File, input: HTMLInputElement) {
    input.value = "";
    setPending(file.name);
    setError("");
    setParsed(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await readHyperplanning(formData);
    setPending(null);
    if (result.error || !result.services) {
      return setError(result.error ?? "Lecture impossible.");
    }
    const found = matchServices(result.services, getModuleName());
    setParsed({
      services: result.services,
      warnings: result.warnings ?? [],
      matched: found.length > 0,
    });
    setChosen(found.length === 1 ? result.services.indexOf(found[0]) : null);
    setTimeout(() => previewRef.current?.focus(), 0);
  }

  const candidates = useMemo(() => {
    if (!parsed) return [];
    const found = matchServices(parsed.services, getModuleName());
    return found.length ? found : parsed.services;
    // Le nom est relu à chaque lecture de fichier, pas à chaque frappe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed]);

  const service = parsed && chosen !== null ? parsed.services[chosen] : null;
  const sessions = useMemo(
    () => (service ? slotsToSessions(service.slots, mode) : []),
    [service, mode],
  );
  const dates = useMemo(() => (service ? moduleDatesFromSlots(service.slots) : null), [service]);
  const changes = current && dates ? describeDateChanges(current, dates) : [];
  const total = sessions.reduce((sum, s) => sum + hours(s), 0);

  const reset = () => {
    setParsed(null);
    setChosen(null);
  };

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-3 rounded-lg border p-3">
      <div>
        <h3 id={`${id}-title`} className="text-sm font-medium">
          Importer depuis l’export Hyperplanning
        </h3>
        <p className="text-muted-foreground text-sm">
          Dépose le PDF « Services intervenant » de l’école : les créneaux de ton module sont lus et
          fusionnés en séances. Tu vérifies l’aperçu avant que quoi que ce soit soit enregistré.
        </p>
      </div>

      {parsed ? null : (
        <FileDropZone
          id={`${id}-file`}
          name=""
          label="Export Hyperplanning (PDF, 4 Mo max)"
          hint="lecture immédiate, le fichier n’est pas conservé"
          accept=".pdf"
          busy={pending ? `Lecture de « ${pending} »…` : null}
          onFile={(file, input) => void read(file, input)}
        />
      )}

      <div aria-live="polite">
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>

      {parsed ? (
        <div className="space-y-3 text-sm">
          <h4 ref={previewRef} tabIndex={-1} className="font-medium outline-none">
            {parsed.matched && candidates.length === 1
              ? `Matière trouvée : ${candidates[0].name}`
              : parsed.matched
                ? "Plusieurs blocs portent le nom de ce module"
                : "Aucune matière ne porte le nom de ce module : choisis-la dans la liste"}
          </h4>

          {candidates.length > 1 || !parsed.matched ? (
            <fieldset className="space-y-1">
              <legend className="sr-only">Matière à importer</legend>
              {candidates.map((s) => {
                const index = parsed.services.indexOf(s);
                return (
                  <label key={index} className="flex items-start gap-2">
                    <input
                      type="radio"
                      name={`${id}-service`}
                      checked={chosen === index}
                      onChange={() => setChosen(index)}
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

          {parsed.warnings.map((w) => (
            <p key={w} className="text-destructive">
              {w}
            </p>
          ))}

          {service && dates ? (
            <>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mode === "merge"}
                  onChange={(e) => setMode(e.target.checked ? "merge" : "separate")}
                />
                Fusionner les créneaux consécutifs d’une même journée en une séance
              </label>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <caption className="mb-1 text-left font-medium">
                    {sessions.length} séance{sessions.length > 1 ? "s" : ""} ·{" "}
                    {formatDuration(total)}
                    {service.totalHours
                      ? ` sur ${formatDuration(service.totalHours)} annoncées`
                      : ""}
                  </caption>
                  <thead>
                    <tr className="text-left">
                      <th scope="col" className="pr-3 font-medium">
                        Séance
                      </th>
                      <th scope="col" className="pr-3 font-medium">
                        Date
                      </th>
                      <th scope="col" className="pr-3 font-medium">
                        Horaires
                      </th>
                      <th scope="col" className="font-medium">
                        Durée
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={`${s.date}-${s.startTime}`}>
                        <th scope="row" className="pr-3 text-left font-normal">
                          Séance {existingCount + i + 1}
                        </th>
                        <td className="pr-3">{frDay(s.date)}</td>
                        <td className="pr-3">
                          {s.startTime}–{s.endTime}
                        </td>
                        <td>{formatDuration(hours(s))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p>
                <strong>Dates proposées :</strong> {summarizeModuleDates(dates)}. La 1re séance fixe
                l’échéance de la progression (J-15).
              </p>
              {changes.length ? (
                <ul className="text-destructive list-disc pl-5">
                  {changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : null}
              {existingCount > 0 ? (
                <p className="text-muted-foreground">
                  Le module a déjà {existingCount} séance{existingCount > 1 ? "s" : ""} : ces
                  séances s’ajoutent à leur suite.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onConfirm(sessions, dates, service);
                    reset();
                  }}
                >
                  Utiliser ces séances et ces dates
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={reset}>
                  Annuler
                </Button>
              </div>
            </>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              Annuler
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}
