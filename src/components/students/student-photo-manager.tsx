"use client";

import { useActionState, useTransition } from "react";

import { ActionError } from "@/components/action-error";
import {
  deleteStudentPhoto,
  uploadStudentPhoto,
  type PhotoState,
} from "@/app/(app)/students/photo-actions";
import { StudentPhoto } from "@/components/students/student-photo";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PHOTO_ACCEPT } from "@/lib/students/photo";

/** Photo de la fiche : ajout, remplacement, suppression. */
export function StudentPhotoManager({
  student,
}: {
  student: { id: string; first_name: string; last_name: string; photo_path: string | null };
}) {
  const [state, formAction, pending] = useActionState<PhotoState, FormData>(
    uploadStudentPhoto.bind(null, student.id),
    {},
  );
  const [removing, startTransition] = useTransition();

  return (
    <section aria-labelledby="photo" className="flex flex-wrap items-start gap-4">
      <StudentPhoto student={student} size="lg" />
      <div className="space-y-3">
        <h2 id="photo" className="text-lg font-medium">
          Photo
        </h2>
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="photo-file">
              {student.photo_path ? "Remplacer la photo" : "Ajouter une photo"}
            </Label>
            <Input id="photo-file" name="photo" type="file" accept={PHOTO_ACCEPT} required />
          </div>
          <PendingButton type="submit" variant="secondary" pending={pending} pendingLabel="Envoi…">
            Enregistrer la photo
          </PendingButton>
          {student.photo_path ? (
            <Button
              type="button"
              variant="ghost"
              disabled={removing}
              onClick={() => startTransition(() => void deleteStudentPhoto(student.id))}
            >
              Supprimer la photo
            </Button>
          ) : null}
        </form>
        <p className="text-muted-foreground text-sm">
          JPEG, PNG ou WebP, 2 Mo maximum. Visible uniquement par toi : jamais dans les exports,
          e-mails ou présentations.
        </p>
        {state.error ? <ActionError error={state.error} /> : null}
        <p role="status" className="text-sm">
          {state.message ?? ""}
        </p>
      </div>
    </section>
  );
}
