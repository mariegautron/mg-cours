"use client";

import { useState, useTransition } from "react";

import { createStudentLinks } from "@/app/(app)/modules/[id]/frise/student-links";
import { ActionError } from "@/components/action-error";
import { Confirm, statusOf } from "@/components/modules/student-links-panel";
import { Button } from "@/components/ui/button";
import type { StudentSpaceModule } from "@/lib/modules/frise-queries";

/**
 * Encart « Espace étudiant·e » de la fiche d'une personne : statut du lien par module, nouveau lien
 * (si quelqu'un a perdu le sien) et message prêt à coller. Le lien ne s'affiche qu'une fois.
 */
export function StudentSpaceCard({ spaces }: { spaces: StudentSpaceModule[] }) {
  const [pending, start] = useTransition();
  const [held, setHeld] = useState<Record<string, { message: string; url: string }>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNote(`${label} copié.`);
    } catch {
      setNote("Copie impossible depuis ce navigateur : sélectionne le texte à la main.");
    }
  }

  if (spaces.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucun module avec des liens personnels pour l’instant.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Un lien ne s’affiche qu’une fois, à sa création. Si cette personne a perdu le sien, crée-lui
        un nouveau lien : l’ancien cesse de fonctionner.
      </p>
      <ul className="divide-y rounded-xl border text-sm">
        {spaces.map((s) => {
          const h = held[s.moduleId];
          const name = `${s.row.name}`;
          return (
            <li key={s.moduleId} className="space-y-2 px-3 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{s.moduleName}</strong>
                <span className="text-muted-foreground">
                  {s.published ? statusOf(s.row) : "Espace pas encore publié"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {h ? (
                  <>
                    <Button
                      type="button"
                      size="touch"
                      variant="secondary"
                      onClick={() => void copy(h.message, "Message")}
                    >
                      Copier le message
                    </Button>
                    <Button
                      type="button"
                      size="touch"
                      variant="outline"
                      onClick={() => void copy(h.url, "Lien")}
                    >
                      Copier le lien
                    </Button>
                  </>
                ) : null}
                <Confirm
                  trigger={s.row.hasLink ? "Nouveau lien" : "Créer le lien"}
                  title={`${s.row.hasLink ? "Nouveau lien" : "Créer le lien"} pour ${name} ?`}
                  description={
                    s.row.hasLink
                      ? `Le lien actuel de ${name} pour « ${s.moduleName} » cessera de fonctionner. Le nouveau ne s’affichera qu’une fois.`
                      : `Un lien est créé pour ${name} seulement. Il ne s’affichera qu’une fois.`
                  }
                  action={s.row.hasLink ? "Créer un nouveau lien" : "Créer le lien"}
                  disabled={pending}
                  onConfirm={() =>
                    start(async () => {
                      const res = await createStudentLinks(s.moduleId, false, s.row.studentId);
                      if (res.error) {
                        setError(res.error);
                        return;
                      }
                      setError("");
                      const l = res.links?.[0];
                      if (l) {
                        setHeld((x) => ({
                          ...x,
                          [s.moduleId]: { message: l.message, url: l.url },
                        }));
                        setNote("Lien créé : copie le message maintenant.");
                      }
                    })
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p role="status" aria-live="polite" className="min-h-5 text-sm font-medium">
        {note}
      </p>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
