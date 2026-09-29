"use client";

import { useState, useTransition } from "react";

import { ActionError } from "@/components/action-error";
import { setAdminDoc, type AdminDocState } from "@/app/(app)/modules/actions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { REQUIRED_ADMIN_DOCS } from "@/lib/ynov/invoice";

const DOCS = REQUIRED_ADMIN_DOCS;

export function AdminDocsChecklist({
  moduleId,
  adminDocs,
}: {
  moduleId: string;
  adminDocs: Record<string, boolean>;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<AdminDocState & { label?: string }>({});

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {DOCS.map((doc) => {
          const checked = !!adminDocs[doc.key];
          const id = `admin-doc-${moduleId}-${doc.key}`;
          return (
            <li key={doc.key} className="flex items-center gap-3">
              <Switch
                id={id}
                checked={checked}
                aria-busy={pending || undefined}
                onCheckedChange={(value) =>
                  // Un second appui pendant l'enregistrement est ignoré (le focus reste sur le
                  // réglage, contrairement à `disabled`).
                  !pending &&
                  startTransition(async () => {
                    setState({});
                    const result = await setAdminDoc(moduleId, doc.key, value);
                    setState({ ...result, label: doc.label });
                  })
                }
              />
              <Label htmlFor={id} className="font-normal">
                {doc.label}
              </Label>
            </li>
          );
        })}
      </ul>
      <p role="status" className="text-muted-foreground min-h-5 text-sm">
        {pending ? "Enregistrement…" : state.saved ? `Enregistré : ${state.label}.` : null}
      </p>
      {state.error ? <ActionError error={state.error} /> : null}
    </div>
  );
}
