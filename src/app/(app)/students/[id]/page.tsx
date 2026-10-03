import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { StudentPhotoManager } from "@/components/students/student-photo-manager";
import { StudentActions } from "@/components/students/student-actions";
import { Pill } from "@/components/dashboard/pill";
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

  const card = "bg-card rounded-xl border p-5";
  const initials = `${student.first_name.charAt(0)}${student.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className="flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-[2_1_0] space-y-4">
        <section aria-labelledby="identity" className={card}>
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="bg-primary/20 text-primary flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <h1 id="identity" className="font-heading text-3xl font-bold tracking-tight">
                {student.first_name} {student.last_name}
              </h1>
              {promos[0] ? (
                <p className="text-muted-foreground text-sm">
                  {promos[0].group} · promotion {promos[0].label}
                </p>
              ) : null}
            </div>
          </div>
          <dl className="mt-3 divide-y text-sm">
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-muted-foreground">E-mail</dt>
              <dd>{student.email ?? "Pas d’e-mail"}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-muted-foreground">Numéro étudiant</dt>
              <dd>{student.student_number ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-2">
            <Button asChild variant="ghost" size="touch">
              <Link href={`/students/${student.id}/edit`}>
                <Pencil aria-hidden />
                Modifier la fiche
              </Link>
            </Button>
          </div>
        </section>

        <StudentPhotoManager student={student} />

        <section aria-labelledby="groups" className={card}>
          <h2 id="groups" className="font-heading mb-2 text-lg font-bold">
            Groupes
          </h2>
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">N’appartient à aucun groupe.</p>
          ) : (
            <div className="space-y-3">
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
                          className="font-semibold underline underline-offset-2"
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

        <section aria-labelledby="promotions" className={card}>
          <h2 id="promotions" className="font-heading mb-2 text-lg font-bold">
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
      </div>

      <div className="min-w-0 flex-[3_1_0] space-y-4">
        <section aria-labelledby="grades" className={card}>
          <h2 id="grades" className="font-heading mb-2 text-xl font-bold">
            Notes par module
          </h2>
          {gradeModules.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune note pour l’instant.</p>
          ) : (
            <div className="space-y-3">
              {gradeModules.map((m) => (
                <section key={m.moduleId} aria-labelledby={`grades-${m.moduleId}`}>
                  <h3 id={`grades-${m.moduleId}`} className="mb-1 text-sm font-semibold">
                    <Link href={`/modules/${m.moduleId}`} className="underline underline-offset-2">
                      {m.moduleName}
                    </Link>
                  </h3>
                  <ul className="divide-y text-sm">
                    {m.lines.map((l) => (
                      <li
                        key={`${l.assessmentId}-${l.isGroupGrade}`}
                        className="flex flex-wrap justify-between gap-2 py-2"
                      >
                        <span>
                          <Link
                            href={`/modules/${l.moduleId}/assessments/${l.assessmentId}`}
                            className="underline underline-offset-2"
                          >
                            {l.assessmentTitle}
                          </Link>
                          {l.isGroupGrade ? " · note de groupe" : ""}
                        </span>
                        <strong>{formatGrade(l.value, l.maxScore)}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="observations" className={card}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 id="observations" className="font-heading text-xl font-bold">
              Journal d’observations
            </h2>
            <Pill tone="warn">Pour toi seule</Pill>
          </div>
          {observations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune observation.</p>
          ) : (
            <ol className="divide-y text-sm">
              {observations.map((o) => (
                <li key={o.id} className="py-2">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <time dateTime={o.created_at} className="font-semibold">
                      {new Date(o.created_at).toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/Paris",
                      })}
                    </time>
                    <span className="text-muted-foreground">
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
          <p className="text-muted-foreground mt-2 text-xs">
            Ce carnet ne sort jamais de l’appli : ni en PDF, ni à l’écran projeté.
          </p>
        </section>

        <section aria-labelledby="appreciations" className={card}>
          <h2 id="appreciations" className="font-heading mb-1 text-lg font-bold">
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
                <li key={a.moduleId} className="bg-muted/40 rounded-lg p-3">
                  <Link
                    href={`/modules/${a.moduleId}/appreciations/${student.id}`}
                    className="font-semibold underline underline-offset-2"
                  >
                    {a.moduleName}
                  </Link>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{a.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="attendance" className={card}>
          <h2 id="attendance" className="font-heading mb-2 text-lg font-bold">
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

        <section aria-labelledby="submissions" className={card}>
          <h2 id="submissions" className="font-heading mb-2 text-lg font-bold">
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

        {student.personal_notes ? (
          <section aria-labelledby="notes" className={card}>
            <h2 id="notes" className="font-heading mb-2 text-lg font-bold">
              Notes personnelles
            </h2>
            <p className="text-sm whitespace-pre-wrap">{student.personal_notes}</p>
          </section>
        ) : null}

        <section aria-labelledby="danger" className={card}>
          <h2 id="danger" className="font-heading mb-2 text-lg font-bold">
            Actions
          </h2>
          <StudentActions id={student.id} />
        </section>
        <Button asChild variant="ghost" size="touch">
          <Link href="/students">← Étudiant·es</Link>
        </Button>
      </div>
    </div>
  );
}
