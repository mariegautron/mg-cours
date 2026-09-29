import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createCourse } from "@/app/(app)/modules/[id]/courses/actions";
import { CourseForm } from "@/components/modules/course-form";
import {
  getModule,
  getModuleCourses,
  getRetainedResources,
  listActiveResources,
} from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Nouvelle séance" };

export default async function NewCoursePage({ params }: PageProps<"/modules/[id]/courses/new">) {
  const { id } = await params;
  const [mod, courses, resources, retained] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    listActiveResources(),
    getRetainedResources(id),
  ]);
  if (!mod) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle séance — {mod.name}</h1>
      <CourseForm
        action={createCourse.bind(null, id)}
        moduleId={id}
        resources={resources}
        retainedIds={retained.map((r) => r.id)}
        nextPosition={courses.length + 1}
      />
    </div>
  );
}
