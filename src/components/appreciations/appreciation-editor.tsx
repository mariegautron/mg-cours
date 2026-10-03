"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Copy } from "lucide-react";

import { saveAppreciation } from "@/app/(app)/modules/[id]/appreciations/actions";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  appreciationStatus,
  counterLabel,
  exportLine,
  STATUS_LABELS,
} from "@/lib/appreciations/appreciation";

const AUTOSAVE_MS = 1200;

/**
 * Appréciation d'une personne (maquette « AppFiche ») : saisie à la main avec compteur et limite de
 * l'école, enregistrement automatique annoncé, « Copier pour Hyperplanning ». Aucune suggestion.
 */
export function AppreciationEditor({
  moduleId,
  studentId,
  firstName,
  lastName,
  initial,
  max,
  backHref,
}: {
  moduleId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  initial: string;
  max: number;
  backHref: string;
}) {
  const name = `${firstName} ${lastName}`;
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = appreciationStatus(text, max);

  async function save(value: string) {
    const result = await saveAppreciation(moduleId, studentId, value);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setSaved(value.trim());
    setMessage(`Appréciation de ${name} enregistrée à ${result.savedAt}.`);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(exportLine({ firstName, lastName, text }));
      setMessage(`Appréciation de ${name} copiée.`);
    } catch {
      setMessage("Copie impossible depuis ce navigateur : sélectionne le texte à la main.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="bg-card space-y-3 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 id="ed" className="font-heading text-2xl font-bold">
            L’appréciation de {name}
          </h1>
          <Pill tone={status === "written" ? "ok" : status === "too_long" ? "lock" : "warn"}>
            {STATUS_LABELS[status]}
            {saved !== text.trim() && status !== "todo" ? " · à enregistrer" : ""}
          </Pill>
        </div>
        <Label htmlFor="appreciation-text">Appréciation de {name}</Label>
        <Textarea
          id="appreciation-text"
          value={text}
          rows={6}
          aria-describedby="appreciation-count"
          aria-invalid={status === "too_long" ? true : undefined}
          onChange={(e) => {
            setText(e.target.value);
            if (timer.current) clearTimeout(timer.current);
            const value = e.target.value;
            timer.current = setTimeout(() => void save(value), AUTOSAVE_MS);
          }}
          onBlur={() => {
            if (timer.current) clearTimeout(timer.current);
            if (text.trim() !== saved) void save(text);
          }}
        />
        <p
          id="appreciation-count"
          className={
            status === "too_long" ? "text-destructive text-sm" : "text-muted-foreground text-sm"
          }
        >
          {counterLabel(text, max)}
        </p>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <p role="status" className="text-muted-foreground min-h-5 text-sm">
          {message}
        </p>
      </section>

      <section aria-labelledby="ok" className="bg-primary/10 space-y-2 rounded-xl border p-5">
        <h2 id="ok" className="text-lg font-semibold">
          Quand c’est bon
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="touch"
            disabled={text.trim() === ""}
            onClick={() => void copy()}
          >
            <Copy aria-hidden />
            Copier pour Hyperplanning
            <span className="sr-only"> : l’appréciation de {name}</span>
          </Button>
          <Button asChild variant="ghost" size="touch">
            <Link href={backHref}>← Toutes les appréciations</Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Rien n’est envoyé tout seul : tu relis toujours, tu modifies comme tu veux.
        </p>
      </section>
    </div>
  );
}
