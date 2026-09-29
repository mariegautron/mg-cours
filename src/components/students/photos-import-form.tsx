"use client";

import { useActionState } from "react";

import { ActionError } from "@/components/action-error";
import { importPhotosZip, type PhotoState } from "@/app/(app)/students/photo-actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PhotosImportForm() {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(importPhotosZip, {});
  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-1">
        <Label htmlFor="zip">Fichier zip de photos</Label>
        <Input id="zip" name="zip" type="file" accept=".zip,application/zip" required />
        <p className="text-muted-foreground text-sm">
          Une photo par étudiant·e, nommée par son numéro étudiant (ex. A12345.jpg). JPEG, PNG ou
          WebP, 2 Mo par photo. Une photo déjà enregistrée est remplacée.
        </p>
      </div>
      <PendingButton type="submit" pending={pending} pendingLabel="Import…">
        Importer les photos
      </PendingButton>
      {state.error ? <ActionError error={state.error} /> : null}
      <p role="status" className="text-sm">
        {state.message ?? ""}
      </p>
    </form>
  );
}
