"use client";

import { useState } from "react";

import { extractFiche } from "@/app/(app)/modules/fiche-actions";
import { FileDropZone } from "@/components/files/file-drop-zone";
import type { FicheData } from "@/lib/modules/fiche";

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
};

const INPUT_IDS: Record<Exclude<keyof FicheData, "schoolName">, string> = {
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

export function FichePrefill({ schools }: { schools: { id: string; name: string }[] }) {
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function read(file: File, input: HTMLInputElement) {
    input.value = "";
    setPending(file.name);
    setMessage(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await extractFiche(formData);
    setPending(null);

    if (result.error || !result.data) {
      return setMessage({ kind: "error", text: result.error ?? "Lecture impossible." });
    }

    const filled: string[] = [];
    for (const [key, value] of Object.entries(result.data) as [
      keyof FicheData,
      string | number,
    ][]) {
      if (key === "schoolName") {
        const school = schools.find((s) => s.name === value);
        if (school && setField("schoolId", school.id)) filled.push(LABELS[key]);
      } else if (setField(INPUT_IDS[key], String(value))) {
        filled.push(LABELS[key]);
      }
    }
    setMessage({
      kind: "ok",
      text: `Préremplis : ${filled.join(", ")}. Vérifiez chaque champ avant d’enregistrer.`,
    });
  }

  return (
    <section aria-labelledby="fiche" className="mb-6 max-w-2xl space-y-3 rounded-lg border p-4">
      <div>
        <h2 id="fiche" className="text-lg font-medium">
          Préremplir depuis la fiche pédagogique
        </h2>
        <p className="text-muted-foreground text-sm">
          Déposez le PDF de l’école : le nom, le YCODE, le niveau et les heures sont lus quand ils
          sont trouvés. Le fichier n’est pas conservé (déposez-le ensuite dans « Documents »).
        </p>
      </div>
      <FileDropZone
        id="ficheFile"
        label="Fiche pédagogique (PDF, 4 Mo max)"
        hint="lecture immédiate, le fichier n’est pas conservé"
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
