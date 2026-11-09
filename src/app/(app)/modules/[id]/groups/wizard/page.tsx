import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GroupWizard } from "@/components/students/group-wizard";
import { getModule } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { listStudents } from "@/lib/students/queries";
import { listEnrollments } from "@/lib/students/enrollment";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Constituer les groupes" };

export default async function GroupWizardPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/groups/wizard">) {
  const { id } = await params;
  const everyone = (await searchParams).toutes === "1";
  const mod = await getModule(id);
  if (!mod) notFound();
  // Les présent·es proposé·es : les inscrit·es du module (pas toute la base).
  const enrolled = await listEnrollments(id);
  const activeIds = new Set(enrolled.rows.filter((e) => !e.leftAt).map((e) => e.studentId));
  if (!everyone && activeIds.size === 0) {
    return (
      <EmptyState
        title="Ta classe n’est pas encore là"
        description="Importe la liste de la promo (export Hyperplanning) : les groupes se font ensuite à partir des inscrit·es."
        actions={[
          { label: "Importer la liste", href: `/modules/${id}/groups/import` },
          { label: "Choisir dans toute la base", href: `/modules/${id}/groups/wizard?toutes=1` },
        ]}
      />
    );
  }
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
  let themeCount = 0;
  if (project) {
    const { count } = await supabase
      .from("project_theme")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id);
    themeCount = count ?? 0;
  }

  return (
    <GroupWizard
      moduleId={id}
      moduleName={mod.name}
      students={students
        .filter((s) => everyone || activeIds.has(s.id))
        .map((s) => ({
          id: s.id,
          first: s.first_name,
          last: s.last_name,
          photoPath: s.photo_path,
        }))}
      takenNames={(existing ?? []).map((g) => g.name)}
      pastGroups={[...byGroup.values()]}
      themeCount={themeCount}
    />
  );
}
