"use client";

import { useId, useState } from "react";

import { Pill } from "@/components/dashboard/pill";
import { ScheduleEditor } from "@/components/modules/schedule-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { calculateDuration, formatDuration } from "@/lib/modules/course-duration";
import {
  hoursBalance,
  originLabel,
  progressionDeadline,
  slotsInSession,
} from "@/lib/modules/create-wizard";
import type { HyperplanningSlot, ModuleDates, SlotMode } from "@/lib/modules/hyperplanning";
import type { ScheduleRow } from "@/lib/modules/schedule-parser";

const frDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const frDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR");

const duration = (s: ScheduleRow) => calculateDuration(s.startTime, s.endTime) ?? 0;

const today = () => new Date().toISOString().slice(0, 10);

type DateKey = "startDate" | "firstSessionDate" | "endDate";

/**
 * Étape 2 : séances déduites (export Hyperplanning et/ou saisies à la main), fusion des créneaux,
 * total d'heures, dates du module et échéance de la progression. Les champs `startDate`,
 * `firstSessionDate` et `endDate` partent avec le formulaire, comme `scheduleJson` (côté parent).
 */
export function PlanningStep({
  sessions,
  slots,
  hasImport,
  mode,
  onMode,
  moduleHours,
  derived,
  onManualRows,
}: {
  /** Séances finales (importées + saisies), triées. */
  sessions: ScheduleRow[];
  /** Créneaux de l'export, pour dire d'où vient chaque séance. */
  slots: HyperplanningSlot[];
  hasImport: boolean;
  mode: SlotMode;
  onMode: (mode: SlotMode) => void;
  moduleHours: number;
  /** Dates déduites des séances. */
  derived: ModuleDates;
  onManualRows: (rows: ScheduleRow[]) => void;
}) {
  const id = useId();
  const [edits, setEdits] = useState<Partial<Record<DateKey, string>>>({});
  const value = (key: DateKey) => edits[key] ?? derived[key] ?? "";
  const planned = sessions.reduce((sum, s) => sum + duration(s), 0);
  const balance = hoursBalance(planned, moduleHours);
  const deadline = progressionDeadline(value("firstSessionDate") || null, today());

  const dateField = (key: DateKey, label: string) => (
    <div className="grid items-center gap-1.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <Label htmlFor={`${id}-${key}`} className="text-muted-foreground font-normal">
        {label}
      </Label>
      <Input
        id={`${id}-${key}`}
        name={key}
        type="date"
        value={value(key)}
        onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="flex flex-wrap items-start gap-6 lg:flex-nowrap">
      <div className="min-w-0 flex-1 basis-full space-y-4 lg:basis-0">
        <section
          aria-labelledby={`${id}-sessions`}
          className="bg-card rounded-3xl border p-5 shadow-sm"
        >
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
            <h2 id={`${id}-sessions`} className="font-heading text-xl font-bold">
              {sessions.length} séance{sessions.length > 1 ? "s" : ""} proposée
              {sessions.length > 1 ? "s" : ""}
            </h2>
            {hasImport ? (
              <div className="flex items-center gap-2.5 font-semibold">
                <Switch
                  id={`${id}-merge`}
                  checked={mode === "merge"}
                  onCheckedChange={(on) => onMode(on ? "merge" : "separate")}
                />
                <Label htmlFor={`${id}-merge`}>Fusionner les créneaux qui se suivent</Label>
              </div>
            ) : null}
          </div>
          {hasImport ? (
            <p className="text-muted-foreground mb-2.5 text-sm">
              Exemple : 08h00 (3 h) puis 11h00 (1 h) deviennent une seule séance de 4 h. Désactive
              pour garder un créneau = une séance.
            </p>
          ) : null}

          {sessions.length ? (
            <div
              role="region"
              aria-label="Séances proposées, défilable"
              tabIndex={0}
              className="focus-visible:ring-ring overflow-x-auto rounded-md focus-visible:ring-2 focus-visible:outline-none"
            >
              <table className="w-full text-sm">
                <caption className="sr-only">
                  {sessions.length} séance{sessions.length > 1 ? "s" : ""} proposée
                  {sessions.length > 1 ? "s" : ""}
                </caption>
                <thead>
                  <tr className="text-muted-foreground text-left text-[0.8rem]">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      N°
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Date
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Horaire
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Durée
                    </th>
                    <th scope="col" className="py-2 font-semibold">
                      Origine
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => (
                    <tr key={`${s.date}-${s.startTime}-${i}`} className="border-t">
                      <th scope="row" className="py-3 pr-3 text-left font-bold">
                        {i + 1}
                      </th>
                      <td className="py-3 pr-3">{frDay(s.date)}</td>
                      <td className="py-3 pr-3">
                        {s.startTime ? `${s.startTime}–${s.endTime ?? ""}` : "—"}
                      </td>
                      <td className="py-3 pr-3">{formatDuration(duration(s)) || "—"}</td>
                      <td className="text-muted-foreground py-3">
                        {originLabel(slotsInSession(s, slots))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground border-t pt-3 text-sm">
              Aucune séance pour l’instant. Dépose l’export à l’étape 1, ou ajoute des créneaux à la
              main ci-dessous : le planning reste facultatif, tu pourras le faire plus tard depuis
              le module.
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t-2 px-1 pt-3.5">
            <strong>
              Total : {formatDuration(planned)}
              {moduleHours > 0 ? ` sur ${formatDuration(moduleHours)} du module` : ""}
            </strong>
            {balance.state === "ok" ? <Pill tone="ok">Le compte est bon</Pill> : null}
            {balance.state === "missing" ? (
              <Pill tone="warn">Il manque {formatDuration(-balance.diff)}</Pill>
            ) : null}
            {balance.state === "extra" ? (
              <Pill tone="warn">{formatDuration(balance.diff)} de plus que le module</Pill>
            ) : null}
          </div>

          <details className="mt-4 border-t pt-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Ajouter ou saisir des créneaux à la main
            </summary>
            <div className="mt-3">
              <ScheduleEditor onRows={onManualRows} />
            </div>
          </details>
        </section>
      </div>

      <div className="w-full min-w-0 space-y-4 lg:w-[26rem] lg:flex-none">
        <aside
          aria-labelledby={`${id}-dates`}
          className="bg-card space-y-3 rounded-3xl border p-5 shadow-sm"
        >
          <h2 id={`${id}-dates`} className="font-heading text-xl font-bold">
            Dates du module
          </h2>
          {dateField("startDate", "Début")}
          {dateField("firstSessionDate", "Date de la 1re séance")}
          {dateField("endDate", "Fin")}
        </aside>

        <aside
          aria-labelledby={`${id}-deadline`}
          className="bg-card rounded-3xl border p-5 shadow-sm"
        >
          <h2 id={`${id}-deadline`} className="font-heading mb-2.5 text-xl font-bold">
            Échéance de la progression
          </h2>
          {deadline ? (
            <>
              <p className="mb-2.5">
                <strong>{frDate(deadline.date)}</strong>{" "}
                <span className="text-muted-foreground">(15 jours avant la 1re séance)</span>
              </p>
              <Pill tone={deadline.tone}>{deadline.label}</Pill>
              {deadline.tone === "warn" ? (
                <p className="text-muted-foreground mt-3 text-sm">
                  Ce n’est pas bloquant : envoie la progression dès qu’elle est prête. Je te
                  rappellerai chaque jour où tu ouvres l’app.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Sans date de 1re séance, il n’y a pas d’échéance : elle se calcule dès qu’une séance
              est planifiée.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
