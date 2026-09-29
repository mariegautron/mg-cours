"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { ActionError } from "@/components/action-error";
import type { StudentFormState } from "@/app/(app)/students/actions";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { schoolYearLabel } from "@/lib/students/groups";
import { currentSchoolYear, schoolYearOptions, type StudentYear } from "@/lib/students/years";
import type { Tables } from "@/types/db";
import { keepFormValues } from "@/lib/use-kept-form";

type Action = (state: StudentFormState, formData: FormData) => Promise<StudentFormState>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function StudentForm({
  action,
  student,
  years = [],
}: {
  action: Action;
  student?: Tables<"student">;
  /** Promotion de chaque année scolaire de l'étudiant·e (US-80b). */
  years?: StudentYear[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const promoByYear = new Map(years.map((y) => [y.year, y.scholar_group ?? ""]));
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [promo, setPromo] = useState(promoByYear.get(currentSchoolYear()) ?? "");

  return (
    <form onSubmit={keepFormValues(formAction)} className="max-w-xl space-y-6">
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
          <Label htmlFor="schoolYear">Année scolaire</Label>
          <select
            id="schoolYear"
            name="schoolYear"
            value={schoolYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              setSchoolYear(y);
              setPromo(promoByYear.get(y) ?? "");
            }}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {schoolYearOptions(years.map((y) => y.year)).map((y) => (
              <option key={y} value={y}>
                {schoolYearLabel(y)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="scholarGroup">Promotion / groupe</Label>
          <Input
            id="scholarGroup"
            name="scholarGroup"
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            aria-describedby="scholarGroup-hint"
          />
          <p id="scholarGroup-hint" className="text-muted-foreground text-sm">
            Enregistrée pour l’année choisie : les autres années ne changent pas.
          </p>
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

      {state.error ? <ActionError error={state.error} /> : null}

      <div className="flex gap-3">
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer
        </PendingButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={student ? `/students/${student.id}` : "/students"}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
