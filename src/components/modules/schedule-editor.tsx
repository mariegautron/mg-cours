"use client";

import { useId, useMemo, useRef, useState } from "react";
import { CopyPlus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/lib/modules/course-duration";
import {
  addDays,
  duplicateRow,
  isValidIsoDate,
  parseSchedule,
  planSessions,
  type IgnoredLine,
  type ScheduleRow,
} from "@/lib/modules/schedule-parser";

interface EditorRow {
  key: number;
  date: string;
  startTime: string;
  endTime: string;
}

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * US-59 : planning d'un module en tableau (ajouter une ligne, dupliquer + 7 jours) ou collé,
 * avec aperçu des séances vides qui seront créées. Envoie `scheduleJson` avec le formulaire.
 */
export function ScheduleEditor({
  totalHours,
  existingCount = 0,
}: {
  /** Heures du module, pour comparer au total planifié. */
  totalHours?: number;
  /** Séances déjà présentes : la numérotation continue à leur suite. */
  existingCount?: number;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const nextKey = useRef(1);
  const [rows, setRows] = useState<EditorRow[]>([]);
  const [pasted, setPasted] = useState("");
  const [ignored, setIgnored] = useState<IgnoredLine[]>([]);
  const [pasteNotice, setPasteNotice] = useState("");

  const valid: ScheduleRow[] = useMemo(
    () =>
      rows
        .filter((r) => isValidIsoDate(r.date))
        .map((r) => ({
          date: r.date,
          startTime: r.startTime || null,
          endTime: r.endTime || null,
        })),
    [rows],
  );
  const plan = useMemo(() => planSessions(valid, existingCount), [valid, existingCount]);
  const withoutDate = rows.length - valid.length;

  const addRows = (list: Omit<EditorRow, "key">[]) =>
    setRows((prev) => [...prev, ...list.map((r) => ({ ...r, key: nextKey.current++ }))]);

  const addRow = () => {
    const last = valid.at(-1) ?? rows.at(-1);
    const date = last && isValidIsoDate(last.date) ? addDays(last.date, 7) : "";
    addRows([{ date, startTime: last?.startTime ?? "", endTime: last?.endTime ?? "" }]);
  };

  const update = (key: number, patch: Partial<EditorRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const duplicate = (row: EditorRow) => {
    const copy = isValidIsoDate(row.date)
      ? duplicateRow({
          date: row.date,
          startTime: row.startTime || null,
          endTime: row.endTime || null,
        })
      : { date: "", startTime: row.startTime || null, endTime: row.endTime || null };
    setRows((prev) => {
      const at = prev.findIndex((r) => r.key === row.key);
      const item = {
        key: nextKey.current++,
        date: copy.date,
        startTime: copy.startTime ?? "",
        endTime: copy.endTime ?? "",
      };
      return [...prev.slice(0, at + 1), item, ...prev.slice(at + 1)];
    });
  };

  const readPasted = () => {
    const formYear = Number(
      (root.current?.closest("form")?.elements.namedItem("year") as HTMLInputElement | null)?.value,
    );
    const year = formYear >= 2000 && formYear < 2100 ? formYear : new Date().getFullYear();
    const result = parseSchedule(pasted, year);
    addRows(
      result.rows.map((r) => ({
        date: r.date,
        startTime: r.startTime ?? "",
        endTime: r.endTime ?? "",
      })),
    );
    setIgnored(result.ignored);
    setPasteNotice(
      `${result.rows.length} créneau${result.rows.length > 1 ? "x" : ""} reconnu${result.rows.length > 1 ? "s" : ""}, ${result.ignored.length} ligne${result.ignored.length > 1 ? "s" : ""} ignorée${result.ignored.length > 1 ? "s" : ""}.`,
    );
    if (!result.ignored.length) setPasted("");
    else setPasted(result.ignored.map((l) => l.text).join("\n"));
  };

  const hoursGap = totalHours ? plan.totalHours - totalHours : 0;

  return (
    <div ref={root} className="space-y-4">
      <input type="hidden" name="scheduleJson" value={JSON.stringify(valid)} />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Créneaux</legend>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Créneaux du planning</caption>
              <thead>
                <tr className="text-left">
                  <th scope="col" className="pr-2 pb-1 font-medium">
                    Date
                  </th>
                  <th scope="col" className="pr-2 pb-1 font-medium">
                    Début
                  </th>
                  <th scope="col" className="pr-2 pb-1 font-medium">
                    Fin
                  </th>
                  <th scope="col" className="pb-1 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key}>
                    <td className="pr-2 pb-2">
                      <Input
                        type="date"
                        aria-label={`Date du créneau ${i + 1}`}
                        value={r.date}
                        onChange={(e) => update(r.key, { date: e.target.value })}
                      />
                    </td>
                    <td className="pr-2 pb-2">
                      <Input
                        type="time"
                        aria-label={`Début du créneau ${i + 1}`}
                        value={r.startTime}
                        onChange={(e) => update(r.key, { startTime: e.target.value })}
                      />
                    </td>
                    <td className="pr-2 pb-2">
                      <Input
                        type="time"
                        aria-label={`Fin du créneau ${i + 1}`}
                        value={r.endTime}
                        onChange={(e) => update(r.key, { endTime: e.target.value })}
                      />
                    </td>
                    <td className="pb-2 whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => duplicate(r)}
                        aria-label={`Dupliquer le créneau ${i + 1} à + 7 jours`}
                      >
                        <CopyPlus aria-hidden />+ 7 jours
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                        aria-label={`Supprimer le créneau ${i + 1}`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Aucun créneau pour l’instant.</p>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={addRow}>
          <Plus aria-hidden />
          Ajouter une ligne
        </Button>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${id}-paste`}>Ou coller un planning</Label>
        <Textarea
          id={`${id}-paste`}
          rows={4}
          className="font-mono text-sm"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          aria-describedby={`${id}-paste-hint`}
          placeholder={"01/10/2026 10:00-12:00\n08/10 14h-16h"}
        />
        <p id={`${id}-paste-hint`} className="text-muted-foreground text-sm">
          Une ligne par créneau : « 01/10/2026 10:00-12:00 », « 01/10 10h-12h », « jeudi 1/10 de 14h
          à 16h »… Sans année, celle du module est utilisée.
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={readPasted}
          disabled={!pasted.trim()}
        >
          Ajouter ces créneaux au tableau
        </Button>
        <div role="status" className="text-sm">
          {pasteNotice}
        </div>
        {ignored.length ? (
          <div className="text-destructive text-sm">
            <p>Lignes non reconnues (laissées dans la zone de collage pour correction) :</p>
            <ul className="list-disc pl-5">
              {ignored.map((l) => (
                <li key={l.line}>
                  Ligne {l.line} : « {l.text} »
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <section aria-labelledby={`${id}-preview`} className="space-y-2 rounded-lg border p-3">
        <h3 id={`${id}-preview`} className="text-sm font-medium">
          Aperçu : {plan.sessions.length} séance{plan.sessions.length > 1 ? "s" : ""} à créer
        </h3>
        <div aria-live="polite" className="space-y-2 text-sm">
          {plan.sessions.length ? (
            <>
              <ol className="space-y-1">
                {plan.sessions.map((s) => (
                  <li key={s.number}>
                    <strong>{s.title}</strong> · {formatDay(s.date)}
                    {s.startTime ? ` · ${s.startTime}${s.endTime ? `–${s.endTime}` : ""}` : ""}
                    {s.hours ? ` (${formatDuration(s.hours)})` : ""} · À préparer
                  </li>
                ))}
              </ol>
              <p className="text-muted-foreground">
                1re séance : {formatDay(plan.firstSessionDate!)} — elle sert de référence pour
                l’échéance de la progression (J-15).
                {plan.totalHours > 0 ? ` ${formatDuration(plan.totalHours)} planifiées` : ""}
                {totalHours && plan.totalHours > 0 ? ` sur ${totalHours} h prévues.` : ""}
              </p>
              {totalHours && plan.totalHours > 0 && Math.abs(hoursGap) > 0.5 ? (
                <p className="text-destructive">
                  {hoursGap < 0
                    ? `Il manque ${formatDuration(-hoursGap)} par rapport aux ${totalHours} h du module.`
                    : `${formatDuration(hoursGap)} de plus que les ${totalHours} h du module.`}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">Aucune séance : le planning reste facultatif.</p>
          )}
          {withoutDate > 0 ? (
            <p className="text-destructive">
              {withoutDate > 1
                ? `${withoutDate} lignes sans date valide ne seront pas créées.`
                : "1 ligne sans date valide ne sera pas créée."}
            </p>
          ) : null}
          {plan.issues.map((issue) => (
            <p key={issue} className="text-destructive">
              {issue}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
