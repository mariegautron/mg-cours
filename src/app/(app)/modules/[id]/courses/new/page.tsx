import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createCourse } from "@/app/(app)/modules/[id]/courses/actions";
import { CourseForm } from "@/components/modules/course-form";
import { getModule, getModuleCourses, listActiveResources } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Nouvelle séance" };

export default async function NewCoursePage({ params }: PageProps<"/modules/[id]/courses/new">) {
  const { id } = await params;
  const [mod, courses, resources] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    listActiveResources(),
  ]);
  if (!mod) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle séance — {mod.name}</h1>
      <CourseForm
        action={createCourse.bind(null, id)}
        moduleId={id}
        resources={resources}
        nextPosition={courses.length + 1}
      />
    </div>
  );
}
