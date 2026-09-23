import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateCourse } from "@/app/(app)/modules/[id]/courses/actions";
import { CourseForm } from "@/components/modules/course-form";
import { getCourse, getModule, listActiveResources } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Modifier la séance" };

export default async function EditCoursePage({
  params,
}: PageProps<"/modules/[id]/courses/[courseId]/edit">) {
  const { id, courseId } = await params;
  const [mod, course, resources] = await Promise.all([
    getModule(id),
    getCourse(courseId),
    listActiveResources(),
  ]);
  if (!mod || !course || course.module_id !== id) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Modifier « {course.title} »</h1>
      <CourseForm
        action={updateCourse.bind(null, id, courseId)}
        moduleId={id}
        course={course}
        resources={resources}
        nextPosition={course.position}
      />
    </div>
  );
}
