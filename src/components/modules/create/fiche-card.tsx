"use client";

import { useRef, useState } from "react";
import { FileText } from "lucide-react";

import { extractFiche } from "@/app/(app)/modules/fiche-actions";
import { Pill } from "@/components/dashboard/pill";
import { FileDropZone } from "@/components/files/file-drop-zone";
import { setField } from "@/components/modules/create/form-fields";
import { ErrorBox, StatusStep } from "@/components/modules/create/status-step";
import { Button } from "@/components/ui/button";
import type { FicheData } from "@/lib/modules/fiche";
import { pendingFichePath, type PendingFiche } from "@/lib/modules/fiche-import";
import { failure } from "@/lib/messages";
import { mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";

type Phase =
  | { kind: "idle" }
  | { kind: "reading"; file: string; stored: boolean }
  | { kind: "done"; file: string; fiche: FicheData; stored: boolean }
  | { kind: "error"; message: string };

const FIELD_IDS = {
  name: "name",
  ycode: "ycode",
  level: "level",
  year: "year",
  totalHours: "totalHours",
  hoursLecture: "hoursLecture",
  hoursTd: "hoursTd",
  hoursTp: "hoursTp",
} as const;

/** Ce que la lecture a trouvé, en une liste de lignes cochées. */
function checklist(fiche: FicheData, stored: boolean) {
  const identity = [fiche.name && "Nom", fiche.ycode && "YCODE", fiche.level && "niveau"].filter(
    Boolean,
  ) as string[];
  const lines: { ok: boolean; text: string }[] = [];
  if (identity.length) lines.push({ ok: true, text: identity.join(", ") });
  if (fiche.totalHours) lines.push({ ok: true, text: `Total de ${fiche.totalHours} h` });
  const goals = fiche.objectives?.length ?? 0;
  lines.push(
    goals
      ? { ok: true, text: `${goals} objectif${goals > 1 ? "s" : ""} lu${goals > 1 ? "s" : ""}` }
      : { ok: false, text: "Aucun objectif lisible : les attendus se saisiront dans le module" },
  );
  const forIntro = (
    [
      [fiche.description, "description"],
      [fiche.objectives?.length, "objectifs"],
      [fiche.prerequisites?.length, "prérequis"],
    ] as const
  )
    .filter(([v]) => v)
    .map(([, label]) => label);
  if (forIntro.length) {
    lines.push({
      ok: true,
      text: `Lus pour la présentation aux étudiant·es : ${forIntro.join(", ")}`,
    });
  }
  lines.push(
    stored
      ? { ok: true, text: "Fiche conservée dans le module" }
      : { ok: false, text: "Fiche non mise de côté : dépose-la ensuite dans le module" },
  );
  return lines;
}

/**
 * Carte « Fiche pédagogique de l'école » : dépôt du PDF, lecture avec avancement, résultat ou erreur.
 * Le PDF est aussi déposé dans le dossier « pending » : l'action de création le conserve comme fiche
 * du module et en lit les attendus.
 */
export function FicheCard({
  schools,
  onRead,
}: {
  schools: { id: string; name: string }[];
  onRead: (fiche: FicheData) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [kept, setKept] = useState<PendingFiche | null>(null);
  const keptRef = useRef<PendingFiche | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  async function store(file: File): Promise<PendingFiche | null> {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const bucket = supabase.storage.from("module-documents");
    if (keptRef.current) await bucket.remove([keptRef.current.path]);
    const mime = mimeOf(file);
    const path = pendingFichePath(auth.user.id, crypto.randomUUID(), safeName(file.name));
    const { error } = await bucket.upload(path, file, { contentType: mime });
    return error ? null : { path, name: file.name, size: file.size, mime };
  }

  async function read(file: File, input: HTMLInputElement) {
    input.value = "";
    setPhase({ kind: "reading", file: file.name, stored: false });
    const formData = new FormData();
    formData.set("file", file);
    const [result, saved] = await Promise.all([
      extractFiche(formData),
      store(file).then((r) => {
        setPhase((p) => (p.kind === "reading" ? { ...p, stored: true } : p));
        return r;
      }),
    ]);
    keptRef.current = saved;
    setKept(saved);

    if (result.error || !result.data) {
      return setPhase({ kind: "error", message: result.error ?? failure("lire le fichier") });
    }
    const fiche = result.data;
    onRead(fiche);
    for (const [key, id] of Object.entries(FIELD_IDS) as [keyof typeof FIELD_IDS, string][]) {
      const value = fiche[key];
      if (value !== undefined && value !== "") setField(id, String(value));
    }
    const school = schools.find((s) => s.name === fiche.schoolName);
    if (school) setField("schoolId", school.id);
    setPhase({ kind: "done", file: file.name, fiche, stored: !!saved });
    setTimeout(() => titleRef.current?.focus(), 0);
  }

  const dropZone = (
    <FileDropZone
      id="ficheFile"
      label="Fiche pédagogique (PDF, 4 Mo max)"
      hint="lecture immédiate, fichier conservé avec le module"
      accept=".pdf"
      onFile={(file, input) => void read(file, input)}
    />
  );

  return (
    <section aria-labelledby="fiche-title" className="bg-card rounded-3xl border p-5 shadow-sm">
      {kept ? <input type="hidden" name="ficheDoc" value={JSON.stringify(kept)} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="fiche-title"
          ref={titleRef}
          tabIndex={-1}
          className="font-heading text-xl font-bold outline-none"
        >
          Fiche pédagogique de l’école
        </h2>
        {phase.kind === "done" ? <Pill tone="ok">Lue</Pill> : null}
        {phase.kind === "reading" ? <Pill tone="wip">Lecture en cours</Pill> : null}
        {phase.kind === "error" ? <Pill tone="warn">Pas lue</Pill> : null}
      </div>
      <p className="text-muted-foreground mt-1.5 mb-3.5 text-sm">
        PDF fourni par YNOV : je lis le nom, les heures et les attendus.
      </p>

      {phase.kind === "idle" ? dropZone : null}

      {phase.kind === "reading" ? (
        <div role="status" aria-label="Lecture de la fiche">
          <ul>
            <StatusStep
              state={phase.stored ? "done" : "running"}
              title="Dépôt du fichier"
              detail={phase.file}
            />
            <StatusStep
              state="running"
              title="Lecture de la fiche"
              detail="nom, heures, attendus"
            />
          </ul>
          <p className="text-muted-foreground mt-2 text-[0.8rem]">
            Rien n’est écrit avant ta confirmation.
          </p>
        </div>
      ) : null}

      {phase.kind === "error" ? (
        <div className="space-y-3">
          <ErrorBox title="Cette fiche n’a pas pu être lue." tone="sun">
            {phase.message}
          </ErrorBox>
          {dropZone}
          <p className="text-muted-foreground text-sm">
            Tu peux aussi continuer et saisir les informations à la main.
          </p>
        </div>
      ) : null}

      {phase.kind === "done" ? (
        <div className="space-y-3.5">
          <div className="bg-muted/40 flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-3">
            <FileText aria-hidden className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{phase.file}</span>
            <Button type="button" variant="ghost" onClick={() => setPhase({ kind: "idle" })}>
              Remplacer
            </Button>
          </div>
          <ul className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            {checklist(phase.fiche, phase.stored).map((l) => (
              <li key={l.text} className="flex items-start gap-2">
                <span aria-hidden className={l.ok ? "text-mint" : "text-sun"}>
                  {l.ok ? "✓" : "!"}
                </span>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
