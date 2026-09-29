"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { FicheData } from "@/lib/modules/fiche";
import { buildStudentIntro } from "@/lib/modules/student-intro";

const FIELD_ID = "studentIntro";

/**
 * Bouton « Proposer un texte depuis la fiche » : remplit le champ Markdown de la présentation avec
 * un brouillon (`buildStudentIntro`). Rien n'est enregistré : c'est le formulaire qui enregistre,
 * après relecture. Un texte déjà saisi n'est remplacé qu'après confirmation.
 */
export function StudentIntroSuggest({ fiche }: { fiche: FicheData | null }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const keepRef = useRef<HTMLButtonElement>(null);
  const proposeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  if (!fiche) {
    return (
      <p className="text-muted-foreground text-sm">
        Dépose d’abord la fiche pédagogique (en haut de la page) : je pourrai proposer un texte à
        partir de sa description, de ses objectifs et de ses prérequis.
      </p>
    );
  }

  const field = () => document.getElementById(FIELD_ID) as HTMLTextAreaElement | null;

  const write = () => {
    const el = field();
    if (!el) return;
    el.value = buildStudentIntro(fiche);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setConfirming(false);
    setMessage("Brouillon inséré. Relis-le et adapte-le avant d’enregistrer le module.");
    proposeRef.current?.focus();
  };

  const propose = () => {
    setMessage("");
    if (field()?.value.trim()) setConfirming(true);
    else write();
  };

  return (
    <div className="space-y-2">
      <Button ref={proposeRef} type="button" size="sm" variant="secondary" onClick={propose}>
        Proposer un texte depuis la fiche
      </Button>
      {confirming ? (
        <div
          role="group"
          aria-labelledby="intro-confirm"
          className="space-y-2 rounded-md border p-3"
        >
          <p id="intro-confirm" className="text-sm">
            Le champ contient déjà un texte. Le remplacer par le brouillon tiré de la fiche ?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              ref={keepRef}
              type="button"
              size="sm"
              onClick={() => {
                setConfirming(false);
                proposeRef.current?.focus();
              }}
            >
              Garder mon texte
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={write}>
              Remplacer par le brouillon
            </Button>
          </div>
        </div>
      ) : null}
      <div aria-live="polite" className="text-sm text-emerald-600 dark:text-emerald-400">
        {message}
      </div>
    </div>
  );
}
