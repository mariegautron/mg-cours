"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Copy, Wand2 } from "lucide-react";

import {
  proposeDraft,
  saveAppreciation,
  setReported,
  validateProposal,
} from "@/app/(app)/modules/[id]/appreciations/actions";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  appreciationStatus,
  counterLabel,
  textOnly,
  STATUS_LABELS,
} from "@/lib/appreciations/appreciation";
import { BASIS_LABELS } from "@/lib/appreciations/draft";

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
  initialProposal = false,
  max,
  backHref,
  prev,
  next,
}: {
  moduleId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  initial: string;
  /** Le texte est un brouillon proposé, pas encore relu. */
  initialProposal?: boolean;
  max: number;
  backHref: string;
  /** Personne précédente / suivante, dans l'ordre alphabétique de la liste. */
  prev?: { href: string; name: string } | null;
  next?: { href: string; name: string } | null;
}) {
  const router = useRouter();
  const name = `${firstName} ${lastName}`;
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState("");
  const [proposal, setProposal] = useState(initialProposal);
  const [basisNote, setBasisNote] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = appreciationStatus(text, max);
  const [saving, setSaving] = useState(false);
  const pending = saving || text.trim() !== saved;

  // Prévient avant de quitter, recharger ou fermer tant que quelque chose n'est pas enregistré.
  useEffect(() => {
    if (!pending) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);

  async function save(value: string, asProposal = proposal) {
    setSaving(true);
    let result: Awaited<ReturnType<typeof saveAppreciation>>;
    try {
      result = await saveAppreciation(moduleId, studentId, value, asProposal);
    } catch {
      setSaving(false);
      setError("L’enregistrement a échoué : ton texte est encore là, réessaie.");
      return;
    }
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setSaved(value.trim());
    setMessage(`Appréciation de ${name} enregistrée à ${result.savedAt}.`);
  }

  async function propose() {
    if (
      text.trim() &&
      !proposal &&
      !window.confirm("Remplacer ce que tu as écrit par un brouillon ?")
    )
      return;
    setMessage("Brouillon en préparation…");
    const r = await proposeDraft(moduleId, studentId);
    if (r.error || !r.text) {
      setError(r.error ?? "Impossible de proposer un brouillon.");
      return;
    }
    setText(r.text);
    setProposal(true);
    setBasisNote(BASIS_LABELS[r.basis ?? "none"]);
    await save(r.text, true);
    setMessage(`Brouillon proposé pour ${name} : à relire avant de le garder.`);
  }

  async function validate() {
    const r = await validateProposal(moduleId, studentId);
    if (r.error) {
      setError(r.error);
      return;
    }
    setProposal(false);
    setMessage(`Appréciation de ${name} validée.`);
  }

  /** Enregistre ce qui est en attente puis change de personne. */
  async function go(e: React.MouseEvent, href: string) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    if (text.trim() !== saved) await save(text, proposal);
    router.push(href);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(textOnly(text));
      await save(text, false);
      await setReported(moduleId, studentId, true);
      setMessage(`Appréciation de ${name} copiée (texte seul), marquée reportée.`);
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
            {proposal && status !== "todo" ? "Proposé, à relire" : STATUS_LABELS[status]}
            {saved !== text.trim() && status !== "todo" ? " · à enregistrer" : ""}
          </Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="touch" onClick={() => void propose()}>
            <Wand2 aria-hidden />
            Proposer un brouillon
          </Button>
          {proposal ? (
            <Button type="button" size="touch" onClick={() => void validate()}>
              Valider cette appréciation
            </Button>
          ) : null}
        </div>
        {proposal && basisNote ? (
          <p className="text-muted-foreground text-sm">{basisNote}</p>
        ) : null}
        <Label htmlFor="appreciation-text">Appréciation de {name}</Label>
        <Textarea
          id="appreciation-text"
          value={text}
          rows={6}
          aria-describedby="appreciation-count"
          aria-invalid={status === "too_long" ? true : undefined}
          onChange={(e) => {
            setText(e.target.value);
            // Une modification de ta part : ce n'est plus un brouillon à relire.
            setProposal(false);
            if (timer.current) clearTimeout(timer.current);
            const value = e.target.value;
            timer.current = setTimeout(() => void save(value, false), AUTOSAVE_MS);
          }}
          onBlur={() => {
            if (timer.current) clearTimeout(timer.current);
            if (text.trim() !== saved) void save(text, proposal);
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
            disabled={text.trim() === "" || status === "too_long" || proposal}
            onClick={() => void copy()}
          >
            <Copy aria-hidden />
            Copier pour Hyperplanning
            <span className="sr-only"> : l’appréciation de {name}</span>
          </Button>
          {proposal ? (
            <p role="status" className="text-muted-foreground self-center text-sm">
              Relis ce brouillon, modifie-le ou valide-le avant de le copier.
            </p>
          ) : null}
          {status === "too_long" ? (
            <p role="status" className="text-destructive self-center text-sm">
              Trop longue pour Hyperplanning : raccourcis avant de copier. Le brouillon est gardé.
            </p>
          ) : null}
          {prev ? (
            <Button asChild variant="outline" size="touch">
              <Link href={prev.href} onClick={(e) => void go(e, prev.href)}>
                ← Précédent·e
                <span className="sr-only"> : {prev.name}</span>
              </Link>
            </Button>
          ) : null}
          {next ? (
            <Button asChild variant="outline" size="touch">
              <Link href={next.href} onClick={(e) => void go(e, next.href)}>
                Suivant·e →<span className="sr-only"> : {next.name}</span>
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="touch">
            <Link
              href={`${backHref}#student-${studentId}`}
              onClick={(e) => void go(e, `${backHref}#student-${studentId}`)}
            >
              ← Toutes les appréciations
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Rien n’est envoyé tout seul : tu relis toujours, tu modifies comme tu veux.
        </p>
      </section>
    </div>
  );
}
