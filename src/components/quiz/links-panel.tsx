"use client";

import { useActionState } from "react";
import { Download, Link2, Mail } from "lucide-react";

import {
  prepareLinks,
  regenerateLink,
  type LinksState,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { Button } from "@/components/ui/button";
import { linksCsv, PERSONAL_LINK_WARNING } from "@/lib/quiz/links";

function LinksResult({ state }: { state: LinksState }) {
  const links = state.links ?? [];
  const download = () => {
    const blob = new Blob(
      [
        linksCsv(
          links.map((l) => ({
            lastName: l.lastName,
            firstName: l.firstName,
            email: l.email,
            url: l.url,
          })),
        ),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "liens-qcm.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="space-y-3">
      {state.errors?.length ? (
        <div
          role="alert"
          className="border-destructive text-destructive rounded-md border p-3 text-sm"
        >
          <ul className="list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.emailReport ? (
        <p role="status" className="text-sm">
          {state.emailReport}
        </p>
      ) : null}
      {state.notices?.length ? (
        <div role="status" className="rounded-md border border-amber-500/50 p-3 text-sm">
          <p className="font-medium">
            Questions déjà vues (banque trop petite pour un tirage entièrement nouveau) :
          </p>
          <ul className="list-disc pl-5">
            {state.notices.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {links.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{PERSONAL_LINK_WARNING}</p>
          <p className="text-muted-foreground text-sm">
            Ces liens ne sont affichés qu’ici, une seule fois : télécharge le CSV maintenant (le
            lien perdu se remplace par « Nouveau lien »).
          </p>
          <Button type="button" size="sm" onClick={download}>
            <Download aria-hidden />
            Télécharger le CSV des liens
          </Button>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <caption className="sr-only">Liens personnels générés</caption>
              <thead>
                <tr className="text-left">
                  <th scope="col" className="p-2">
                    Étudiant·e
                  </th>
                  <th scope="col" className="p-2">
                    Lien personnel
                  </th>
                  <th scope="col" className="p-2">
                    E-mail
                  </th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.attemptId} className="border-t">
                    <th scope="row" className="p-2 text-left font-normal">
                      {l.name}
                    </th>
                    <td className="p-2">
                      <code className="text-xs break-all">{l.url}</code>
                    </td>
                    <td className="p-2">
                      {l.emailed ? "Envoyé" : l.email ? "Non envoyé" : "Pas d’adresse"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Prépare les tirages et les liens personnels de celles et ceux qui n'en ont pas encore. */
export function PrepareLinks({
  moduleId,
  assessmentId,
  missing,
}: {
  moduleId: string;
  assessmentId: string;
  missing: number;
}) {
  const [state, action, pending] = useActionState(
    prepareLinks.bind(null, moduleId, assessmentId),
    {} as LinksState,
  );
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-2">
        <p className="text-sm">
          {missing > 0
            ? `${missing} étudiant·e${missing > 1 ? "s" : ""} sans lien : chacun·e reçoit son propre tirage, figé.`
            : "Tout le monde a déjà un lien."}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="send" /> Envoyer aussi le lien par e-mail (à celles et ceux
          qui ont une adresse)
        </label>
        <p className="text-muted-foreground text-xs">
          {PERSONAL_LINK_WARNING} Chaque étudiant·e reçoit uniquement le sien.
        </p>
        <Button type="submit" size="sm" disabled={pending || missing === 0}>
          <Link2 aria-hidden />
          {pending ? "Préparation…" : "Préparer les tirages et les liens"}
        </Button>
      </form>
      <LinksResult state={state} />
    </div>
  );
}

/** Nouveau lien pour une copie pas encore rendue (l'ancien est révoqué). */
export function RegenerateLink({
  moduleId,
  assessmentId,
  attemptId,
  name,
  hasEmail,
}: {
  moduleId: string;
  assessmentId: string;
  attemptId: string;
  name: string;
  hasEmail: boolean;
}) {
  const [state, action, pending] = useActionState(
    regenerateLink.bind(null, moduleId, assessmentId, attemptId),
    {} as LinksState,
  );
  return (
    <form action={action} className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Nouveau lien<span className="sr-only"> pour {name}</span>
        </Button>
        {hasEmail ? (
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" name="send" />
            <Mail aria-hidden className="size-3" /> envoyer
          </label>
        ) : null}
      </div>
      <LinksResult state={state} />
    </form>
  );
}
