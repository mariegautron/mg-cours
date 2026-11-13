"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Copy, Wand2 } from "lucide-react";

import {
  detectTemplateParts,
  otherFormulation,
  saveAppreciation,
  setReported,
  startFromTemplate,
} from "@/app/(app)/modules/[id]/appreciations/actions";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  appreciationStatus,
  counterLabel,
  hasHole,
  textOnly,
  STATUS_LABELS,
} from "@/lib/appreciations/appreciation";
import {
  BASIS_LABELS,
  locateParts,
  PARTS,
  PART_LABELS,
  type Part,
  type Sentences,
} from "@/lib/appreciations/draft";
import { useConfirm } from "@/components/use-confirm";

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
  prev,
  next,
}: {
  moduleId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  initial: string;
  max: number;
  backHref: string;
  /** Personne précédente / suivante, dans l'ordre alphabétique de la liste. */
  prev?: { href: string; name: string } | null;
  next?: { href: string; name: string } | null;
}) {
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const name = `${firstName} ${lastName}`;
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState("");
  const [sentences, setSentences] = useState<Partial<Sentences> | null>(null);
  const [basisNote, setBasisNote] = useState("");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = appreciationStatus(text, max);
  const [saving, setSaving] = useState(false);
  const pending = saving || text.trim() !== saved;

  // Après un rechargement, les phrases du gabarit encore présentes gardent « Autre formulation ».
  useEffect(() => {
    if (!initial.trim()) return;
    let alive = true;
    void detectTemplateParts(moduleId, studentId, initial).then((r) => {
      if (alive && r.sentences) setSentences((s) => s ?? r.sentences);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function save(value: string): Promise<boolean> {
    setSaving(true);
    let result: Awaited<ReturnType<typeof saveAppreciation>>;
    try {
      result = await saveAppreciation(moduleId, studentId, value);
    } catch {
      setSaving(false);
      setError("L’enregistrement a échoué : ton texte est encore là, réessaie.");
      return false;
    }
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    setError("");
    setSaved(value.trim());
    setMessage(`Appréciation de ${name} enregistrée à ${result.savedAt}.`);
    return true;
  }

  async function fromTemplate() {
    if (
      text.trim() &&
      !(await confirm({
        title: "Remplacer ton texte par le gabarit ?",
        description: "Ce que tu as écrit dans cette appréciation est remplacé par le gabarit.",
        confirmLabel: "Remplacer",
      }))
    )
      return;
    setMessage("Gabarit en préparation…");
    const r = await startFromTemplate(moduleId, studentId);
    if (r.error || !r.text) {
      setError(r.error ?? "Impossible de préparer le gabarit.");
      return;
    }
    setText(r.text);
    setSentences(r.sentences ?? null);
    setBasisNote(BASIS_LABELS[r.basis ?? "none"]);
    await save(r.text);
    setMessage(`Gabarit prêt pour ${name} : complète les [à compléter…] avant de copier.`);
  }

  const [busyPart, setBusyPart] = useState<Part | null>(null);
  async function another(part: Part) {
    setBusyPart(part);
    try {
      await anotherInner(part);
    } finally {
      setBusyPart(null);
    }
  }
  async function anotherInner(part: Part) {
    const current = sentences?.[part];
    // Chaque bouton change SA partie, retrouvée même si les trous ont été remplis.
    const at = current && sentences ? locateParts(text, sentences)[part] : null;
    if (!current || !at) {
      setMessage("Cette phrase a déjà été modifiée : remplace-la à la main.");
      return;
    }
    const r = await otherFormulation(moduleId, studentId, part, current);
    if (r.error || !r.phrase) {
      setError(r.error ?? "Aucune autre formulation.");
      return;
    }
    const before = text.slice(0, at.start);
    const after = text.slice(at.end);
    const nextText = `${before}${r.phrase}${after.startsWith(" ") || after === "" ? "" : " "}${after}`;
    setText(nextText);
    setSentences({ ...sentences, [part]: r.phrase });
    await save(nextText);
    setMessage(
      r.fresh
        ? `Autre formulation pour « ${PART_LABELS[part]} ».`
        : `Plus de formulation inédite pour « ${PART_LABELS[part]} » : ajoute les tiennes dans Réglages.`,
    );
  }

  /** Enregistre ce qui est en attente puis change de personne. */
  async function go(e: React.MouseEvent, href: string) {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    // Rien n'est perdu : si l'enregistrement échoue, on reste sur la page avec le texte.
    if (text.trim() !== saved && !(await save(text))) return;
    router.push(href);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(textOnly(text));
      await save(text);
      await setReported(moduleId, studentId, true);
      setMessage(`Appréciation de ${name} copiée (texte seul), marquée reportée.`);
    } catch {
      setMessage("Copie impossible depuis ce navigateur : sélectionne le texte à la main.");
    }
  }

  return (
    <div className="space-y-4">
      {confirmDialog}
      <section className="bg-card space-y-3 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 id="ed">L’appréciation de {name}</h1>
          <Pill tone={status === "written" ? "ok" : status === "too_long" ? "lock" : "warn"}>
            {STATUS_LABELS[status]}
            {saved !== text.trim() && status !== "todo" ? " · à enregistrer" : ""}
          </Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="touch"
            onClick={() => void fromTemplate()}
          >
            <Wand2 aria-hidden />
            {text.trim() ? "Remplacer par le gabarit" : "Partir d’un gabarit"}
          </Button>
          <Link
            href={`/assessments/comments?type=appreciation&retour=${encodeURIComponent(`/modules/${moduleId}/appreciations/${studentId}`)}`}
            className="text-muted-foreground text-sm underline underline-offset-2"
          >
            Mes formulations
          </Link>
        </div>
        {sentences ? (
          <div role="group" aria-label="Autre formulation" className="flex flex-wrap gap-2">
            {PARTS.filter((part) => sentences[part]).map((part) => (
              <Button
                key={part}
                type="button"
                variant="outline"
                size="sm"
                disabled={busyPart !== null}
                aria-busy={busyPart === part}
                onClick={() => void another(part)}
              >
                {busyPart === part
                  ? "Nouvelle formulation…"
                  : `Autre formulation : ${PART_LABELS[part].toLowerCase()}`}
              </Button>
            ))}
          </div>
        ) : null}
        {sentences && basisNote ? (
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
            if (timer.current) clearTimeout(timer.current);
            const value = e.target.value;
            timer.current = setTimeout(() => void save(value), AUTOSAVE_MS);
          }}
          onBlur={(e) => {
            if (timer.current) clearTimeout(timer.current);
            // Valeur réelle du champ : un remplacement d'un coup (collage, remplissage auto,
            // glisser-déposer, champ vidé par un outil) est pris même s'il n'a pas déclenché de saisie.
            const value = e.currentTarget.value;
            if (value !== text) setText(value);
            if (value.trim() !== saved) void save(value);
          }}
          onInput={(e) => {
            const value = e.currentTarget.value;
            if (value !== text) setText(value);
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
        <h2 id="ok" className="text-sm font-semibold">
          Quand c’est bon
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="touch"
            disabled={text.trim() === "" || status === "too_long" || hasHole(text)}
            onClick={() => void copy()}
          >
            <Copy aria-hidden />
            Copier pour Hyperplanning
            <span className="sr-only"> : l’appréciation de {name}</span>
          </Button>
          {hasHole(text) ? (
            <p role="status" className="text-destructive self-center text-sm">
              Il reste un [à compléter…] : remplace-le avant de copier.
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
