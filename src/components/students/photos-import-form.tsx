"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";

import { ActionError } from "@/components/action-error";
import { Pill } from "@/components/dashboard/pill";
import {
  importPhotosZip,
  type PhotoReportRow,
  type PhotoState,
} from "@/app/(app)/students/photo-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { cn } from "@/lib/utils";

const card = "bg-card space-y-3 rounded-xl border p-5";

const STATUS: Record<
  PhotoReportRow["status"],
  { label: string; tone: "ok" | "warn" | "wip" | "plain" }
> = {
  matched: { label: "Fiche reconnue", tone: "ok" },
  ambiguous: { label: "À choisir", tone: "warn" },
  unmatched: { label: "Sans fiche", tone: "wip" },
  rejected: { label: "Refusée", tone: "plain" },
};

/**
 * Importer le trombinoscope (maquette « ImportTrombi » + états de « FeedImport ») : 1 · le fichier,
 * 2 · ce qui a été reconnu, 3 · vérification avant d'enregistrer. Rien n'est écrit avant l'accord :
 * le fichier est d'abord analysé (aperçu), puis enregistré à la confirmation.
 */
export function PhotosImportForm() {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(importPhotosZip, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const send = (intent: "preview" | "save") => {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    data.set("intent", intent);
    setSaving(intent === "save");
    startTransition(() => formAction(data));
  };

  const report = state.report;
  const count = (status: PhotoReportRow["status"]) =>
    report?.filter((r) => r.status === status).length ?? 0;
  const matched = count("matched");
  const analysing = pending && !saving;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        send(report ? "save" : "preview");
      }}
    >
      <div className="flex flex-col gap-6 pb-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-[1_1_0] space-y-4">
          <section aria-labelledby="d1" className={card}>
            <div className="flex items-center justify-between gap-2">
              <h2 id="d1" className="text-lg font-semibold">
                1 · Le fichier
              </h2>
              {report ? <Pill tone="ok">Lu</Pill> : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="zip">Fichier zip de photos</Label>
              <input
                id="zip"
                name="zip"
                type="file"
                accept=".zip,application/zip"
                required
                className="file:bg-secondary block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:px-4 file:font-medium"
                onChange={(e) => {
                  setFileName(e.target.files?.[0]?.name ?? null);
                  if (e.target.files?.length) send("preview");
                }}
              />
              <p className="text-muted-foreground text-sm">
                Une photo par étudiant·e, nommée par son numéro étudiant (A12345.jpg) ou par son nom
                (DUPONT Camille.jpg). JPEG, PNG ou WebP, 2 Mo par photo.
              </p>
            </div>
            {analysing ? (
              <p role="status" className="text-sm font-medium">
                Lecture du fichier…
              </p>
            ) : report ? (
              <p className="text-sm">
                <strong>
                  {report.length} photo{report.length > 1 ? "s" : ""}
                </strong>{" "}
                lue
                {report.length > 1 ? "s" : ""}
                {fileName ? ` dans ${fileName}` : ""}.
              </p>
            ) : null}
          </section>

          {report ? (
            <section aria-labelledby="d2" className={card}>
              <h2 id="d2" className="text-lg font-semibold">
                2 · Ce que j’ai trouvé
              </h2>
              <dl className="divide-y text-sm">
                {(
                  [
                    ["Fiches reconnues", matched],
                    ["À choisir (plusieurs fiches possibles)", count("ambiguous")],
                    ["Sans fiche correspondante", count("unmatched")],
                    ["Refusées (format ou taille)", count("rejected")],
                  ] as const
                ).map(([label, n]) => (
                  <div key={label} className="flex justify-between gap-3 py-2">
                    <dt>{label}</dt>
                    <dd className="font-semibold">{n}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground text-xs">
                La correspondance se fait par le numéro étudiant ou par le nom, sans tenir compte
                des accents ni de la casse.
              </p>
            </section>
          ) : null}

          <section aria-labelledby="d3" className={card}>
            <h2 id="d3" className="font-semibold">
              Confidentialité
            </h2>
            <p className="text-muted-foreground text-sm">
              Les photos restent privées : elles n’apparaissent jamais dans les exports, les e-mails
              ni la fenêtre projetée.
            </p>
          </section>
        </div>

        <section aria-labelledby="ap" className={cn(card, "min-w-0 flex-[2_1_0]")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="ap" className="text-lg font-semibold">
              3 · Vérifie avant d’enregistrer
            </h2>
            <span className="text-muted-foreground text-sm">Rien n’est écrit avant ton accord</span>
          </div>
          {report ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {report.map((r) => (
                <li
                  key={r.name}
                  className={cn(
                    "bg-muted/40 flex flex-col gap-1 rounded-lg border p-2",
                    r.status === "ambiguous" && "border-sun/60",
                  )}
                >
                  <span
                    aria-hidden
                    className="bg-muted text-muted-foreground flex aspect-[3/2.6] items-end rounded-md p-2 text-lg font-bold"
                  >
                    {(r.student ?? r.name).slice(0, 2).toUpperCase()}
                  </span>
                  <strong className="text-sm break-words">{r.student ?? r.name}</strong>
                  {r.student ? (
                    <span className="text-muted-foreground text-xs break-all">{r.name}</span>
                  ) : null}
                  <Pill tone={STATUS[r.status].tone} className="self-start">
                    {STATUS[r.status].label}
                  </Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Choisis un fichier : je relie chaque photo à une fiche, tu vérifies, puis
              j’enregistre.
            </p>
          )}
        </section>
      </div>

      {state.error ? <ActionError error={state.error} /> : null}
      {state.message ? (
        <p role="status" className="bg-mint/15 rounded-lg border p-3 text-sm font-medium">
          {state.message}{" "}
          <Link href="/students" className="underline underline-offset-2">
            Voir les étudiant·es
          </Link>
        </p>
      ) : (
        <p role="status" className="sr-only" />
      )}

      <div className="bg-background/95 sticky bottom-0 z-10 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button asChild variant="ghost" size="touch">
          <Link href="/students">Annuler</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground text-sm">
            Une photo déjà enregistrée sera remplacée.
          </span>
          <PendingButton
            type="submit"
            size="touch-lg"
            pending={pending && saving}
            pendingLabel="Import…"
            disabled={!report || matched === 0 || (pending && !saving)}
          >
            {report ? `Enregistrer ${matched} photo${matched > 1 ? "s" : ""}` : "Enregistrer"}
          </PendingButton>
        </div>
      </div>
    </form>
  );
}
