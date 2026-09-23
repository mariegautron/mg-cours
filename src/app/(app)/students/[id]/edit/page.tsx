import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateStudent } from "@/app/(app)/students/actions";
import { StudentForm } from "@/components/students/student-form";
import { getStudent } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Modifier l’étudiant·e" };

export default async function EditStudentPage({ params }: PageProps<"/students/[id]/edit">) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Modifier « {student.first_name} {student.last_name} »
      </h1>
      <StudentForm action={updateStudent.bind(null, id)} student={student} />
    </div>
  );
}
