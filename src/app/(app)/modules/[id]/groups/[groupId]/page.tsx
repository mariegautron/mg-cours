import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteGroupButton } from "@/components/students/delete-group-button";
import { GroupMembers } from "@/components/students/group-members";
import { Badge } from "@/components/ui/badge";
import { getGroup, listStudents } from "@/lib/students/queries";

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
  const [group, students] = await Promise.all([getGroup(groupId), listStudents()]);
  if (!group || group.module_id !== id) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <Badge variant="secondary">{GROUP_TYPE_LABELS[group.type] ?? group.type}</Badge>
        </div>
        <DeleteGroupButton moduleId={id} groupId={groupId} />
      </div>

      <GroupMembers moduleId={id} groupId={groupId} members={group.members} candidates={students} />
    </div>
  );
}
