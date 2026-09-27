import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { StudentActions } from "@/components/students/student-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { groupsBySchoolYear } from "@/lib/students/groups";
import { getStudent, getStudentGroups } from "@/lib/students/queries";

export async function generateMetadata({ params }: PageProps<"/students/[id]">): Promise<Metadata> {
  const { id } = await params;
  const student = await getStudent(id);
  return { title: student ? `${student.first_name} ${student.last_name}` : "Étudiant·e" };
}

export default async function StudentPage({ params }: PageProps<"/students/[id]">) {
  const { id } = await params;
  const [student, groups] = await Promise.all([getStudent(id), getStudentGroups(id)]);
  if (!student) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-muted-foreground">
            {student.email ?? "Pas d’e-mail"}
            {student.student_number ? ` · ${student.student_number}` : ""}
          </p>
          {student.scholar_group ? (
            <Badge variant="secondary">{student.scholar_group}</Badge>
          ) : null}
        </div>
        <Button asChild variant="secondary">
          <Link href={`/students/${student.id}/edit`}>
            <Pencil aria-hidden />
            Modifier
          </Link>
        </Button>
      </div>

      <section aria-labelledby="groups">
        <h2 id="groups" className="mb-2 text-lg font-medium">
          Groupes
        </h2>
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">N’appartient à aucun groupe.</p>
        ) : (
          <div className="space-y-4">
            {groupsBySchoolYear(groups).map((y) => (
              <section key={y.label} aria-labelledby={`groups-${y.label}`}>
                <h3
                  id={`groups-${y.label}`}
                  className="text-muted-foreground mb-1 text-sm font-medium"
                >
                  {y.year === null ? y.label : `Année ${y.label}`}
                </h3>
                <ul className="space-y-1 text-sm">
                  {y.groups.map((g) => (
                    <li key={g.id}>
                      <Link
                        href={`/modules/${g.module_id}/groups/${g.id}`}
                        className="underline underline-offset-2"
                      >
                        {g.display}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      {student.personal_notes ? (
        <section aria-labelledby="notes">
          <h2 id="notes" className="mb-2 text-lg font-medium">
            Notes personnelles
          </h2>
          <p className="text-sm whitespace-pre-wrap">{student.personal_notes}</p>
        </section>
      ) : null}

      <section aria-labelledby="danger">
        <h2 id="danger" className="mb-2 text-lg font-medium">
          Actions
        </h2>
        <StudentActions id={student.id} />
      </section>
    </div>
  );
}
