import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GroupWizard } from "@/components/students/group-wizard";
import { getModule } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { listStudents } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Constituer les groupes" };

export default async function GroupWizardPage({
  params,
}: PageProps<"/modules/[id]/groups/wizard">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();
  const supabase = await createClient();
  const [students, { data: existing }, { data: members }, { data: project }] = await Promise.all([
    listStudents(),
    supabase.from("student_group").select("name").eq("module_id", id),
    supabase.from("group_member").select("student_group_id, student_id"),
    supabase.from("module_project").select("id").eq("module_id", id).maybeSingle(),
  ]);

  // Groupes passés (tous modules) : base des binômes « déjà vus ».
  const byGroup = new Map<string, string[]>();
  for (const m of members ?? []) {
    byGroup.set(m.student_group_id, [...(byGroup.get(m.student_group_id) ?? []), m.student_id]);
  }
  let hasThemes = false;
  if (project) {
    const { count } = await supabase
      .from("project_theme")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id);
    hasThemes = (count ?? 0) > 0;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Constituer les groupes — {mod.name}</h1>
      <GroupWizard
        moduleId={id}
        students={students.map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }))}
        takenNames={(existing ?? []).map((g) => g.name)}
        pastGroups={[...byGroup.values()]}
        hasThemes={hasThemes}
      />
    </div>
  );
}
