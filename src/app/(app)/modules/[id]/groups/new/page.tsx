import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createGroup } from "@/app/(app)/modules/[id]/groups/actions";
import { GroupForm } from "@/components/students/group-form";
import { getModule } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Nouveau groupe" };

export default async function NewGroupPage({ params }: PageProps<"/modules/[id]/groups/new">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouveau groupe — {mod.name}</h1>
      <GroupForm action={createGroup.bind(null, id)} moduleId={id} />
    </div>
  );
}
