import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { StudentPhotoManager } from "@/components/students/student-photo-manager";
import { StudentActions } from "@/components/students/student-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OBSERVATION_TAG_LABELS } from "@/lib/notebook/notebook";
import { listStudentObservations } from "@/lib/notebook/queries";
import {
  listStudentAppreciations,
  listStudentGradeLines,
  listStudentSubmissions,
} from "@/lib/students/record-queries";
import { absences, ATTENDANCE_LABELS, formatGrade, gradesByModule } from "@/lib/students/record";
import { groupsBySchoolYear } from "@/lib/students/groups";
import { getStudent, getStudentGroups, getStudentYears } from "@/lib/students/queries";
import { promotions } from "@/lib/students/years";

export async function generateMetadata({ params }: PageProps<"/students/[id]">): Promise<Metadata> {
  const { id } = await params;
  const student = await getStudent(id);
  return { title: student ? `${student.first_name} ${student.last_name}` : "Étudiant·e" };
}

export default async function StudentPage({ params }: PageProps<"/students/[id]">) {
  const { id } = await params;
  const [student, groups, observations, years, gradeLines, appreciations, submissions] =
    await Promise.all([
      getStudent(id),
      getStudentGroups(id),
      listStudentObservations(id),
      getStudentYears(id),
      listStudentGradeLines(id),
      listStudentAppreciations(id),
      listStudentSubmissions(id),
    ]);
  const gradeModules = gradesByModule(gradeLines);
  const missed = absences(gradeLines);
  const promos = promotions(years);
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
          {promos[0] ? (
            <Badge variant="secondary">
              {promos[0].group} · {promos[0].label}
            </Badge>
          ) : null}
        </div>
        <Button asChild variant="secondary">
          <Link href={`/students/${student.id}/edit`}>
            <Pencil aria-hidden />
            Modifier
          </Link>
        </Button>
      </div>

      <StudentPhotoManager student={student} />

      <section aria-labelledby="promotions">
        <h2 id="promotions" className="mb-2 text-lg font-medium">
          Promotions
        </h2>
        {promos.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune promotion enregistrée.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {promos.map((p) => (
              <li key={p.year}>
                <span className="text-muted-foreground">{p.label}</span> : {p.group}
              </li>
            ))}
          </ul>
        )}
      </section>

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
                  {y.year === null
                    ? y.label
                    : `Année ${y.label}${promos.find((p) => p.year === y.year) ? ` · ${promos.find((p) => p.year === y.year)!.group}` : ""}`}
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

      <section aria-labelledby="grades">
        <h2 id="grades" className="mb-2 text-lg font-medium">
          Notes par module
        </h2>
        {gradeModules.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune note pour l’instant.</p>
        ) : (
          <div className="space-y-3">
            {gradeModules.map((m) => (
              <section key={m.moduleId} aria-labelledby={`grades-${m.moduleId}`}>
                <h3 id={`grades-${m.moduleId}`} className="mb-1 text-sm font-medium">
                  <Link href={`/modules/${m.moduleId}`} className="underline underline-offset-2">
                    {m.moduleName}
                  </Link>
                </h3>
                <ul className="space-y-1 text-sm">
                  {m.lines.map((l) => (
                    <li key={`${l.assessmentId}-${l.isGroupGrade}`}>
                      <Link
                        href={`/modules/${l.moduleId}/assessments/${l.assessmentId}`}
                        className="underline underline-offset-2"
                      >
                        {l.assessmentTitle}
                      </Link>{" "}
                      : {formatGrade(l.value, l.maxScore)}
                      {l.isGroupGrade ? " (note de groupe)" : ""}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="attendance">
        <h2 id="attendance" className="mb-2 text-lg font-medium">
          Présences
        </h2>
        {missed.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune absence notée.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {missed.map((l) => (
              <li key={`${l.assessmentId}-${l.isGroupGrade}`}>
                {l.moduleName} · {l.assessmentTitle} : {ATTENDANCE_LABELS[l.attendance]}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="appreciations">
        <h2 id="appreciations" className="mb-1 text-lg font-medium">
          Appréciations
        </h2>
        {!appreciations.available ? (
          <p className="text-muted-foreground text-sm">
            Les appréciations seront disponibles après la mise à jour de la base de données.
          </p>
        ) : appreciations.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune appréciation écrite.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {appreciations.items.map((a) => (
              <li key={a.moduleId} className="rounded-lg border p-2">
                <Link
                  href={`/modules/${a.moduleId}/appreciations`}
                  className="font-medium underline underline-offset-2"
                >
                  {a.moduleName}
                </Link>
                <p className="mt-1 whitespace-pre-wrap">{a.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="submissions">
        <h2 id="submissions" className="mb-2 text-lg font-medium">
          Rendus
        </h2>
        {submissions.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun rendu déposé.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {submissions.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/modules/${r.moduleId}/assessments/${r.assessmentId}`}
                  className="underline underline-offset-2"
                >
                  {r.assessmentTitle}
                </Link>{" "}
                : {r.label}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="observations">
        <h2 id="observations" className="mb-1 text-lg font-medium">
          Journal d’observations
        </h2>
        <p className="text-muted-foreground mb-2 text-xs">
          Privé : notes prises en séance, du plus récent au plus ancien. Jamais projeté ni envoyé.
        </p>
        {observations.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune observation.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {observations.map((o) => (
              <li key={o.id} className="rounded-lg border p-2">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <time dateTime={o.created_at} className="text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Paris",
                    })}
                  </time>
                  <span>
                    {[o.module?.name, o.course?.title].filter(Boolean).join(" · ") ||
                      "Séance supprimée"}
                  </span>
                  <Badge variant="outline">{OBSERVATION_TAG_LABELS[o.tag]}</Badge>
                </p>
                {o.note ? <p className="mt-1 whitespace-pre-wrap">{o.note}</p> : null}
              </li>
            ))}
          </ol>
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
