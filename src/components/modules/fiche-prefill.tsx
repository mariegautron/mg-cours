"use client";

import { useState } from "react";

import { extractFiche } from "@/app/(app)/modules/fiche-actions";
import { FileDropZone } from "@/components/files/file-drop-zone";
import type { FicheData } from "@/lib/modules/fiche";
import { pendingFichePath, type PendingFiche } from "@/lib/modules/fiche-import";
import { mimeOf, safeName } from "@/lib/storage/files";
import { createClient } from "@/lib/supabase/client";

const LABELS: Record<keyof FicheData, string> = {
  name: "Nom",
  ycode: "YCODE",
  level: "Niveau",
  year: "Année",
  totalHours: "Heures totales",
  hoursLecture: "Heures cours",
  hoursTd: "Heures TD",
  hoursTp: "Heures TP",
  schoolName: "École",
  description: "Description",
  objectives: "Objectifs",
  prerequisites: "Prérequis",
};

/** Lus pour la présentation aux étudiant·es, pas pour un champ du formulaire. */
type IntroKey = "description" | "objectives" | "prerequisites";

const INPUT_IDS: Record<Exclude<keyof FicheData, "schoolName" | IntroKey>, string> = {
  name: "name",
  ycode: "ycode",
  level: "level",
  year: "year",
  totalHours: "totalHours",
  hoursLecture: "hoursLecture",
  hoursTd: "hoursTd",
  hoursTp: "hoursTp",
};

/** Écrit une valeur dans un champ non contrôlé du formulaire module. */
function setField(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  if (!el) return false;
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

/**
 * À la création, le PDF est aussi déposé (dossier « pending » du stockage) et référencé par un champ
 * caché du formulaire : l'action de création le conserve comme fiche du module et en lit les attendus.
 */
export function FichePrefill({
  schools,
  formId,
  keepFile,
  onRead,
}: {
  schools: { id: string; name: string }[];
  formId: string;
  keepFile: boolean;
  /** Reçoit ce que la fiche contient, pour proposer la présentation aux étudiant·es. */
  onRead?: (fiche: FicheData) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [stored, setStored] = useState<PendingFiche | null>(null);

  async function store(file: File): Promise<PendingFiche | null> {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const bucket = supabase.storage.from("module-documents");
    if (stored) await bucket.remove([stored.path]);
    const mime = mimeOf(file);
    const path = pendingFichePath(auth.user.id, crypto.randomUUID(), safeName(file.name));
    const { error } = await bucket.upload(path, file, { contentType: mime });
    return error ? null : { path, name: file.name, size: file.size, mime };
  }

  async function read(file: File, input: HTMLInputElement) {
    input.value = "";
    setPending(file.name);
    setMessage(null);
    const formData = new FormData();
    formData.set("file", file);
    const [result, kept] = await Promise.all([
      extractFiche(formData),
      keepFile ? store(file) : Promise.resolve(null),
    ]);
    setPending(null);
    setStored(kept);

    if (result.error || !result.data) {
      return setMessage({ kind: "error", text: result.error ?? "Lecture impossible." });
    }

    onRead?.(result.data);
    const filled: string[] = [];
    for (const [key, value] of Object.entries(result.data) as [
      keyof FicheData,
      string | number,
    ][]) {
      if (key === "description" || key === "objectives" || key === "prerequisites") continue;
      if (key === "schoolName") {
        const school = schools.find((s) => s.name === value);
        if (school && setField("schoolId", school.id)) filled.push(LABELS[key]);
      } else if (setField(INPUT_IDS[key], String(value))) {
        filled.push(LABELS[key]);
      }
    }
    const saved = kept
      ? " La fiche sera conservée avec le module et ses attendus seront lus."
      : keepFile
        ? " La fiche n’a pas pu être mise de côté : dépose-la ensuite dans l’onglet Administratif."
        : "";
    const forIntro = (["description", "objectives", "prerequisites"] as const)
      .filter((k) => result.data?.[k])
      .map((k) => LABELS[k].toLowerCase());
    setMessage({
      kind: "ok",
      text:
        (filled.length
          ? `Préremplis : ${filled.join(", ")}. Vérifie chaque champ avant d’enregistrer.`
          : "Aucun champ à préremplir.") +
        (forIntro.length
          ? ` Lus pour la présentation aux étudiant·es : ${forIntro.join(", ")}.`
          : "") +
        saved,
    });
  }

  return (
    <section aria-labelledby="fiche" className="mb-6 max-w-2xl space-y-3 rounded-lg border p-4">
      <div>
        <h2 id="fiche" className="text-lg font-medium">
          Préremplir depuis la fiche pédagogique
        </h2>
        <p className="text-muted-foreground text-sm">
          Dépose le PDF de l’école : le nom, le YCODE, le niveau et les heures sont lus quand ils
          sont trouvés.{" "}
          {keepFile
            ? "Le fichier est conservé avec le module (« Attendus de l’école ») et ses attendus sont lus à l’enregistrement."
            : "Le fichier n’est pas conservé : dépose-le ensuite dans l’onglet Administratif."}
        </p>
      </div>
      {stored ? (
        <input type="hidden" name="ficheDoc" form={formId} value={JSON.stringify(stored)} />
      ) : null}
      <FileDropZone
        id="ficheFile"
        label="Fiche pédagogique (PDF, 4 Mo max)"
        hint={keepFile ? "lecture immédiate, fichier conservé avec le module" : "lecture immédiate"}
        accept=".pdf"
        busy={pending ? `Lecture de « ${pending} »…` : null}
        onFile={(file, input) => void read(file, input)}
      />
      <div aria-live="polite">
        {message ? (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={
              message.kind === "error"
                ? "text-destructive text-sm"
                : "text-sm text-emerald-600 dark:text-emerald-400"
            }
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
