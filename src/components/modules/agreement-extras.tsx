"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  attachDocumentToModule,
  listAttachTargets,
  updateAgreementMeta,
} from "@/app/(app)/modules/[id]/documents/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { schoolYearOf } from "@/lib/modules/list-state";
import type { Tables } from "@/types/db";

/** Libellé libre, date de signature et « Rattacher aussi à un autre module » d'une convention. */
export function AgreementExtras({
  moduleId,
  doc,
}: {
  moduleId: string;
  doc: Tables<"module_document">;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(doc.label ?? "");
  const [signedOn, setSignedOn] = useState(doc.signed_on ?? "");
  const [targets, setTargets] = useState<{ id: string; name: string; year: number }[] | null>(null);
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [pending, startTransition] = useTransition();
  const id = `agr-${doc.id}`;

  return (
    <div className="mt-2 w-full space-y-3 border-t pt-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${id}-label`}>Libellé</Label>
          <Input
            id={`${id}-label`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={120}
            placeholder="Convention, Avenant 1…"
            className="w-56"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-date`}>Date de signature</Label>
          <Input
            id={`${id}-date`}
            type="date"
            value={signedOn}
            onChange={(e) => setSignedOn(e.target.value)}
            className="w-44"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="touch"
          aria-busy={pending || undefined}
          onClick={() =>
            !pending &&
            startTransition(async () => {
              const r = await updateAgreementMeta(moduleId, doc.id, label, signedOn);
              setMessage(r.error ? { error: r.error } : { ok: "Libellé et date enregistrés." });
              router.refresh();
            })
          }
        >
          Enregistrer le libellé
        </Button>
      </div>

      <details
        onToggle={(e) => {
          if ((e.currentTarget as HTMLDetailsElement).open && targets === null) {
            void listAttachTargets(moduleId).then(setTargets);
          }
        }}
      >
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
          Rattacher aussi à un autre module
        </summary>
        <div className="flex flex-wrap items-end gap-3 pt-1">
          <div className="space-y-1">
            <Label htmlFor={`${id}-target`}>Autre module</Label>
            <select
              id={`${id}-target`}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="border-input bg-background h-11 rounded-md border px-3 text-sm"
            >
              <option value="">{targets === null ? "Chargement…" : "Choisir un module"}</option>
              {(targets ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({schoolYearOf(m.year)})
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="touch"
            disabled={!target}
            aria-busy={pending || undefined}
            onClick={() =>
              !pending &&
              startTransition(async () => {
                const r = await attachDocumentToModule(moduleId, doc.id, target);
                setMessage(
                  r.error
                    ? { error: r.error }
                    : { ok: `Rattaché aussi à « ${r.attached} » : le fichier n’est pas copié.` },
                );
              })
            }
          >
            Rattacher
          </Button>
        </div>
      </details>

      <p role="status" className="min-h-5 text-sm text-emerald-600 dark:text-emerald-400">
        {message.ok ?? ""}
      </p>
      {message.error ? <ActionError error={message.error} /> : null}
    </div>
  );
}
