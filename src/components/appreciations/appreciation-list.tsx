"use client";

import { useRef, useState } from "react";
import { Copy, Download } from "lucide-react";

import { saveAppreciation } from "@/app/(app)/modules/[id]/appreciations/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  appreciationStatus,
  counterLabel,
  exportAll,
  exportCsv,
  exportLine,
  STATUS_LABELS,
  type AppreciationStatus,
} from "@/lib/appreciations/appreciation";

export interface AppreciationStudent {
  id: string;
  firstName: string;
  lastName: string;
  text: string;
  /** Rappel pour t'aider à écrire : moyenne de l'étudiant·e dans ce module (/20), s'il y en a une. */
  average: number | null;
}

const AUTOSAVE_MS = 1200;

/**
 * Appréciations pour Hyperplanning, écrites à la main (US-149a) : statut en mots, champ avec
 * compteur et limite de l'école, enregistrement automatique annoncé, « Copier » par ligne et
 * « Tout copier » / CSV pour coller dans Hyperplanning. Aucune suggestion automatique.
 */
export function AppreciationList({
  moduleId,
  students,
  max,
}: {
  moduleId: string;
  students: AppreciationStudent[];
  max: number;
}) {
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.text])),
  );
  const [saved, setSaved] = useState<Record<string, string>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.text])),
  );
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const rows = students.map((s) => ({
    firstName: s.firstName,
    lastName: s.lastName,
    text: texts[s.id] ?? "",
  }));
  const written = students.filter((s) => (texts[s.id] ?? "").trim() !== "").length;

  async function save(s: AppreciationStudent, text: string) {
    const result = await saveAppreciation(moduleId, s.id, text);
    if (result.error) {
      setErrors((e) => ({ ...e, [s.id]: result.error! }));
      return;
    }
    setErrors((e) => ({ ...e, [s.id]: "" }));
    setSaved((v) => ({ ...v, [s.id]: text.trim() }));
    setMessage(`Appréciation de ${s.firstName} ${s.lastName} enregistrée à ${result.savedAt}.`);
  }

  function change(s: AppreciationStudent, text: string) {
    setTexts((t) => ({ ...t, [s.id]: text }));
    clearTimeout(timers.current[s.id]);
    timers.current[s.id] = setTimeout(() => void save(s, text), AUTOSAVE_MS);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copié.`);
    } catch {
      setMessage("Copie impossible depuis ce navigateur : sélectionne le texte à la main.");
    }
  }

  function downloadCsv() {
    const blob = new Blob(["﻿", exportCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "appreciations-hyperplanning.csv";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMessage("CSV téléchargé.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {written} appréciation{written > 1 ? "s" : ""} écrite{written > 1 ? "s" : ""} sur{" "}
          {students.length}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="touch"
            disabled={written === 0}
            onClick={() => void copy(exportAll(rows), "Tout")}
          >
            <Copy aria-hidden />
            Tout copier
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="touch"
            disabled={written === 0}
            onClick={downloadCsv}
          >
            <Download aria-hidden />
            Télécharger le CSV
          </Button>
        </div>
      </div>
      <p role="status" className="text-muted-foreground min-h-5 text-sm">
        {message}
      </p>

      <ul className="space-y-4">
        {students.map((s) => {
          const text = texts[s.id] ?? "";
          const status: AppreciationStatus = appreciationStatus(text, max);
          const id = `appreciation-${s.id}`;
          const name = `${s.firstName} ${s.lastName}`;
          return (
            <li key={s.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-medium">{name}</h2>
                <p className="text-sm font-medium">
                  {STATUS_LABELS[status]}
                  {saved[s.id] !== text.trim() && status !== "todo" ? " · à enregistrer" : ""}
                </p>
              </div>
              {s.average !== null ? (
                <p className="text-muted-foreground text-sm">
                  Moyenne dans ce module :{" "}
                  {s.average.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} / 20
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">Pas encore de note dans ce module.</p>
              )}
              <Label htmlFor={id}>Appréciation de {name}</Label>
              <Textarea
                id={id}
                value={text}
                rows={3}
                aria-describedby={`${id}-count`}
                aria-invalid={status === "too_long" ? true : undefined}
                onChange={(e) => change(s, e.target.value)}
                onBlur={() => {
                  clearTimeout(timers.current[s.id]);
                  if (text.trim() !== (saved[s.id] ?? "")) void save(s, text);
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  id={`${id}-count`}
                  className={
                    status === "too_long"
                      ? "text-destructive text-sm"
                      : "text-muted-foreground text-sm"
                  }
                >
                  {counterLabel(text, max)}
                </p>
                <Button
                  type="button"
                  size="touch"
                  variant="outline"
                  disabled={text.trim() === ""}
                  onClick={() =>
                    void copy(
                      exportLine({ firstName: s.firstName, lastName: s.lastName, text }),
                      `Appréciation de ${name}`,
                    )
                  }
                >
                  <Copy aria-hidden />
                  Copier<span className="sr-only"> l’appréciation de {name}</span>
                </Button>
              </div>
              {errors[s.id] ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors[s.id]}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
