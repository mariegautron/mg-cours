"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { StudentFormState } from "@/app/(app)/students/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/types/db";

type Action = (state: StudentFormState, formData: FormData) => Promise<StudentFormState>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function StudentForm({ action, student }: { action: Action; student?: Tables<"student"> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            defaultValue={student?.first_name ?? ""}
            aria-describedby={fe.firstName ? "firstName-error" : undefined}
          />
          <FieldError id="firstName" errors={fe.firstName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            defaultValue={student?.last_name ?? ""}
            aria-describedby={fe.lastName ? "lastName-error" : undefined}
          />
          <FieldError id="lastName" errors={fe.lastName} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={student?.email ?? ""}
            aria-describedby={fe.email ? "email-error" : undefined}
          />
          <FieldError id="email" errors={fe.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentNumber">Numéro étudiant</Label>
          <Input
            id="studentNumber"
            name="studentNumber"
            defaultValue={student?.student_number ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scholarGroup">Promotion / groupe</Label>
          <Input
            id="scholarGroup"
            name="scholarGroup"
            defaultValue={student?.scholar_group ?? ""}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="personalNotes">Notes personnelles</Label>
          <Textarea
            id="personalNotes"
            name="personalNotes"
            rows={4}
            defaultValue={student?.personal_notes ?? ""}
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={student ? `/students/${student.id}` : "/students"}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
