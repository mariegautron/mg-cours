"use client";

import { useState, useTransition } from "react";

import { setSchoolTopics } from "@/app/(app)/modules/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { frTime } from "@/lib/fr-time";

/**
 * « Sujets à voir avec l'école » (champ libre du module) : ce qu'il faut demander ou signaler à
 * l'école. Affiché aussi sur Aujourd'hui tant qu'il est rempli.
 */
export function SchoolTopicsCard({ moduleId, initial }: { moduleId: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const dirty = text.trim() !== saved.trim();

  return (
    <section
      aria-labelledby="school-topics"
      className="bg-card space-y-2 rounded-xl border px-5 py-4"
    >
      <h2 id="school-topics" className="text-sm font-semibold">
        Sujets à voir avec l’école
      </h2>
      <label htmlFor="school-topics-text" className="text-muted-foreground block text-[0.8125rem]">
        Questions, demandes, points à signaler. Visible sur Aujourd’hui tant que c’est rempli.
      </label>
      <Textarea
        id="school-topics-text"
        value={text}
        maxLength={4000}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending || !dirty}
          onClick={() =>
            start(async () => {
              const res = await setSchoolTopics(moduleId, text);
              if (res.error) {
                setMessage(res.error);
                return;
              }
              setSaved(text);
              setMessage(`Enregistré à ${frTime()}.`);
            })
          }
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {saved.trim() ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await setSchoolTopics(moduleId, "");
                if (res.error) {
                  setMessage(res.error);
                  return;
                }
                setText("");
                setSaved("");
                setMessage("Vidé : plus rien sur Aujourd’hui.");
              })
            }
          >
            Tout est vu
          </Button>
        ) : null}
        <p role="status" className="text-muted-foreground text-[0.8125rem]">
          {dirty ? "Modifié · non enregistré" : message}
        </p>
      </div>
    </section>
  );
}
