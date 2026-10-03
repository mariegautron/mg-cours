import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SessionBuilder, type BuilderCourse } from "@/components/modules/session-builder";
import { getModulePlans } from "@/lib/modules/course-plan-queries";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { orderResources } from "@/lib/modules/session-builder";

export const metadata: Metadata = { title: "Construire les séances" };

export default async function BuildSessionsPage({ params }: PageProps<"/modules/[id]/build">) {
  const { id } = await params;
  const [mod, courses] = await Promise.all([getModule(id), getModuleCourses(id)]);
  if (!mod) notFound();
  const { available, plans } = await getModulePlans(courses.map((c) => c.id));

  const items: BuilderCourse[] = courses.map((c) => {
    const plan = plans.get(c.id);
    return {
      id: c.id,
      title: c.title,
      date: c.session_date,
      prepStatus: c.prep_status,
      completion: c.completion,
      deliverable: plan?.deliverable ?? "",
      resources: orderResources(c.resources, plan?.resourceOrder).map((r) => ({
        id: r.id,
        title: r.title,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Construire les séances</h1>
      <SessionBuilder moduleId={id} courses={items} planAvailable={available} />
    </div>
  );
}
