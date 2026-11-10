import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteGroupButton } from "@/components/students/delete-group-button";
import { GroupMembers } from "@/components/students/group-members";
import { Badge } from "@/components/ui/badge";
import { ObservationItem } from "@/components/notebook/observation-item";
import { listGroupObservations } from "@/lib/notebook/queries";
import { createClient } from "@/lib/supabase/server";
import { getGroup, listStudents } from "@/lib/students/queries";
import { listEnrollments } from "@/lib/students/enrollment";

const GROUP_TYPE_LABELS: Record<string, string> = { tp: "TP", td: "TD", project: "Projet" };

export async function generateMetadata({
  params,
}: PageProps<"/modules/[id]/groups/[groupId]">): Promise<Metadata> {
  const { groupId } = await params;
  const group = await getGroup(groupId);
  return { title: group?.name ?? "Groupe" };
}

export default async function GroupPage({ params }: PageProps<"/modules/[id]/groups/[groupId]">) {
  const { id, groupId } = await params;
  const [group, students, observations, enrolled] = await Promise.all([
    getGroup(groupId),
    listStudents(),
    listGroupObservations(groupId),
    listEnrollments(id),
  ]);
  // Les inscrit·es du module (pas parti·es) sont proposé·es en premier.
  const moduleStudentIds = enrolled.rows.filter((e) => !e.leftAt).map((e) => e.studentId);
  if (!group || group.module_id !== id) notFound();
  const supabase = await createClient();
  const { data: rawGrades } = await supabase
    .from("grade")
    .select(
      "value, strengths, progress, feedback, assessment:assessment_id(id, title, max_score, module_id)",
    )
    .eq("student_group_id", groupId);
  const grades = (
    (rawGrades ?? []) as unknown as {
      value: number | null;
      strengths: string | null;
      progress: string | null;
      feedback: string | null;
      assessment: { id: string; title: string; max_score: number | null; module_id: string } | null;
    }[]
  ).filter((g) => g.assessment?.module_id === id);
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <Badge variant="secondary">{GROUP_TYPE_LABELS[group.type] ?? group.type}</Badge>
        </div>
        <DeleteGroupButton moduleId={id} groupId={groupId} />
      </div>

      <GroupMembers
        moduleId={id}
        groupId={groupId}
        members={group.members}
        candidates={students}
        moduleStudentIds={moduleStudentIds}
        leftIds={enrolled.rows.filter((e) => e.leftAt).map((e) => e.studentId)}
      />

      <section aria-labelledby="group-notes" className="bg-card space-y-2 rounded-xl border p-5">
        <h2 id="group-notes" className="text-lg font-semibold">
          Notes et commentaires du groupe
        </h2>
        {grades.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune note de groupe pour l’instant.</p>
        ) : (
          <ul className="divide-y text-sm">
            {grades.map((g) => (
              <li key={g.assessment?.id} className="space-y-1 py-2">
                <p className="flex justify-between gap-2">
                  <span className="font-medium">{g.assessment?.title}</span>
                  <strong>
                    {g.value === null
                      ? "pas de note"
                      : `${fmt(g.value)} sur ${fmt(g.assessment?.max_score ?? 20)}`}
                  </strong>
                </p>
                {g.strengths?.trim() ? <p>Points forts : {g.strengths}</p> : null}
                {g.progress?.trim() ? <p>Progrès : {g.progress}</p> : null}
                {g.feedback?.trim() ? <p className="whitespace-pre-wrap">{g.feedback}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="group-obs" className="bg-card space-y-2 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="group-obs" className="text-lg font-semibold">
            Observations sur le groupe
          </h2>
          <Badge variant="outline">Pour toi seule</Badge>
        </div>
        {observations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Rien noté sur ce groupe. Tu peux le faire pendant le cours, depuis la vue privée.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {observations.map((o) => (
              <li key={o.id} className="py-2">
                <ObservationItem
                  id={o.id}
                  scope="group"
                  studentId={groupId}
                  tag={o.tag}
                  note={o.note}
                  heading={
                    <>
                      <time dateTime={o.created_at} className="font-semibold">
                        {new Date(o.created_at).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Europe/Paris",
                        })}
                      </time>
                      {o.course ? (
                        <span className="text-muted-foreground">{o.course.title}</span>
                      ) : null}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
