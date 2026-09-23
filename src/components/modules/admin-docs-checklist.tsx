"use client";

import { useTransition } from "react";

import { setAdminDoc } from "@/app/(app)/modules/actions";
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
