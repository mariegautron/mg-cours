"use client";

import { useRef, useState, useTransition } from "react";

import {
  commitDeposit,
  getDeposit,
  prepareUploads,
  type DepositState,
} from "@/app/espace/[token]/deposit-actions";
import { Button } from "@/components/ui/button";
import { ASSESSMENT_FILE_ACCEPT, ASSESSMENT_FILES_BUCKET } from "@/lib/assessments/files";
import { lateLabel, parisDayTime } from "@/lib/deposits/rules";
import { createClient } from "@/lib/supabase/client";

const fmtDate = (iso: string) => parisDayTime(iso);

const size = (n: number | null) =>
  n === null
    ? ""
    : n < 1024 * 1024
      ? `${Math.max(1, Math.round(n / 1024))} Ko`
      : `${(n / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;

/**
 * Dépôt d'un rendu depuis l'espace personnel. Les fichiers partent directement vers le stockage par des
 * adresses signées de courte durée ; la date de dépôt est celle du serveur. Un retard est seulement
 * signalé. Un rendu de groupe est partagé : remplacer le dépôt d'un·e camarade demande confirmation.
 */
export function DepositBox({
  token,
  assessmentId,
  accepts,
  initial,
  deadlineLabel,
}: {
  token: string;
  assessmentId: string;
  accepts: "file" | "link" | "both";
  initial: DepositState;
  deadlineLabel: string;
}) {
  const [state, setState] = useState<DepositState>(initial);
  const [files, setFiles] = useState<File[]>([]);
  const [link, setLink] = useState("");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [sent, setSent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const deposited = state.items.length > 0;

  function submit(confirmed = false) {
    setError("");
    setDone(false);
    if (deposited && state.byOther && !confirmed) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    start(async () => {
      const meta = files.map((f) => ({ name: f.name, size: f.size, mime: f.type }));
      const prep = await prepareUploads(token, assessmentId, meta, link.trim() || null);
      if (prep.error || !prep.batchId || !prep.uploads) {
        setError(prep.error ?? "L’envoi n’a pas pu démarrer.");
        return;
      }
      const storage = createClient().storage.from(ASSESSMENT_FILES_BUCKET);
      setSent(0);
      for (const [i, file] of files.entries()) {
        setProgress(`Envoi de ${file.name} (${i + 1} sur ${files.length})…`);
        const up = prep.uploads[i];
        // Coupure : trois essais automatiques, avec une pause croissante.
        let failed = true;
        for (let attempt = 1; attempt <= 3 && failed; attempt++) {
          const { error: upError } = await storage.uploadToSignedUrl(up.path, up.token, file);
          failed = !!upError;
          if (failed && attempt < 3) {
            setProgress(`Pas de connexion… nouvel essai automatique (${attempt}/2).`);
            await new Promise((r) => setTimeout(r, attempt * 2500));
          }
        }
        if (failed) {
          setProgress("");
          setError(
            "L’envoi a été interrompu (connexion ?). Rien n’est déposé, tes fichiers restent sélectionnés : réessaie.",
          );
          return;
        }
        setSent(i + 1);
      }
      setProgress("Enregistrement…");
      const res = await commitDeposit(token, assessmentId, prep.batchId, meta, link.trim() || null);
      setProgress("");
      if (res.error) {
        setError(res.error);
        setState(res);
        return;
      }
      setState(res);
      setFiles([]);
      setLink("");
      setDone(true);
    });
  }

  async function refresh() {
    setState(await getDeposit(token, assessmentId));
  }

  return (
    <section aria-labelledby="depot" className="bg-card mt-7 rounded-2xl border p-5">
      <h2 id="depot" className="font-heading text-xl font-bold">
        Déposer mon rendu
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        À rendre : {deadlineLabel}.{" "}
        {state.group ? `Rendu de groupe (${state.group}) : tout le groupe voit le même dépôt.` : ""}
      </p>

      {deposited ? (
        <div role="status" className="mt-3 rounded-xl border p-3 text-sm">
          <p className="font-semibold">
            C’est rendu ! Le {state.submittedAt ? fmtDate(state.submittedAt) : ""}
            {state.byName && state.group ? `, déposé par ${state.byName}` : ""}.
          </p>
          {state.lateMinutes > 0 ? (
            <p className="text-muted-foreground">
              Rendu en retard ({lateLabel(state.lateMinutes)}). C’est seulement signalé.
            </p>
          ) : null}
          <ul className="mt-1 list-disc pl-5">
            {state.items.map((it) => (
              <li key={it.id}>
                {it.kind === "link" ? (
                  <>Lien : {it.url}</>
                ) : (
                  <>
                    {it.fileName} ({size(it.sizeBytes)})
                  </>
                )}
              </li>
            ))}
          </ul>
          {state.closed ? null : (
            <p className="text-muted-foreground mt-1">
              Tu peux le remplacer en déposant à nouveau.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          Pas encore rendu. Tu peux déposer à tout moment ; après la date limite, ce sera signalé en
          retard.
        </p>
      )}

      {state.closed ? (
        <p className="mt-4 rounded-md border p-3 text-sm font-medium">
          Ton rendu est corrigé, tu ne peux plus le remplacer.
        </p>
      ) : null}
      {/* Rendu corrigé : plus aucun champ de dépôt (pas seulement masqué). */}
      {state.closed ? null : (
        <div className="mt-4 space-y-3">
          {accepts !== "link" ? (
            <div>
              <label htmlFor="depot-fichiers" className="text-sm font-medium">
                Fichiers (50 Mo maximum chacun)
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
                }}
                className={`mt-1 rounded-md border-2 border-dashed p-3 text-center text-sm ${dragging ? "bg-accent" : ""}`}
              >
                Glisse tes fichiers ici, ou choisis-les ci-dessous.
              </div>
              <input
                id="depot-fichiers"
                ref={input}
                type="file"
                multiple
                accept={ASSESSMENT_FILE_ACCEPT}
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="bg-background mt-1 block w-full rounded-md border px-2 py-2 text-sm"
              />
            </div>
          ) : null}
          {accepts !== "file" ? (
            <div>
              <label htmlFor="depot-lien" className="text-sm font-medium">
                Lien (par exemple GitHub)
              </label>
              <input
                id="depot-lien"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://github.com/…"
                className="bg-background mt-1 block w-full rounded-md border px-2 py-2 text-sm"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="touch"
              disabled={pending || (files.length === 0 && !link.trim())}
              onClick={() => submit()}
            >
              {deposited ? "Remplacer mon rendu" : "Déposer mon rendu"}
            </Button>
            <Button type="button" size="touch" variant="ghost" onClick={() => void refresh()}>
              Actualiser
            </Button>
          </div>
          {pending && files.length > 0 ? (
            <progress
              className="w-full"
              max={files.length}
              value={sent}
              aria-label="Progression de l’envoi"
            />
          ) : null}
          {files.length > 0 ? (
            <ul className="text-sm">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  {f.name} ({size(f.size)})
                </li>
              ))}
            </ul>
          ) : null}
          {confirming ? (
            <div
              role="alertdialog"
              aria-labelledby="depot-confirm"
              className="bg-muted space-y-2 rounded-xl border p-3 text-sm"
            >
              <p id="depot-confirm" className="font-medium">
                {state.byName ?? "Un·e camarade"} a déjà déposé un rendu
                {state.submittedAt ? ` le ${fmtDate(state.submittedAt)}` : ""}. Le remplacer ?
              </p>
              <div className="flex gap-2">
                <Button type="button" size="touch" onClick={() => submit(true)}>
                  Remplacer
                </Button>
                <Button
                  type="button"
                  size="touch"
                  variant="ghost"
                  onClick={() => setConfirming(false)}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : null}
          <p role="status" aria-live="polite" className="min-h-5 text-sm">
            {progress}
            {done ? " Dépôt enregistré." : ""}
          </p>
          {error ? (
            <p role="alert" className="text-sm font-medium">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
