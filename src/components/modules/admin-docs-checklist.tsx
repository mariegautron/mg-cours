"use client";

import { useTransition } from "react";

import { setAdminDoc } from "@/app/(app)/modules/actions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const DOCS: { key: string; label: string }[] = [
  { key: "fiche_positionnement", label: "Fiche de positionnement" },
  { key: "progression_pedagogique", label: "Progression pédagogique" },
  { key: "supports_moodle", label: "Supports déposés sur Moodle" },
  { key: "sujets_grilles_moodle", label: "Sujets et grilles déposés sur Moodle" },
];

export function AdminDocsChecklist({
  moduleId,
  adminDocs,
}: {
  moduleId: string;
  adminDocs: Record<string, boolean>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <ul className="space-y-3">
      {DOCS.map((doc) => {
        const checked = !!adminDocs[doc.key];
        const id = `admin-doc-${doc.key}`;
        return (
          <li key={doc.key} className="flex items-center gap-3">
            <Switch
              id={id}
              checked={checked}
              disabled={pending}
              onCheckedChange={(value) =>
                startTransition(() => {
                  void setAdminDoc(moduleId, doc.key, value);
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
  );
}
