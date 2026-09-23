import type { Metadata } from "next";

import { createStudent } from "@/app/(app)/students/actions";
import { StudentForm } from "@/components/students/student-form";

export const metadata: Metadata = { title: "Nouvel·le étudiant·e" };

export default function NewStudentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvel·le étudiant·e</h1>
      <StudentForm action={createStudent} />
    </div>
  );
}
