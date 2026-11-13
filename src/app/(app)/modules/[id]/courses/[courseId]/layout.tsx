import { ObjectCrumbs } from "@/components/nav/place-nav";
import { formatSessionDay } from "@/lib/dashboard/today";
import { getModuleCourses } from "@/lib/modules/queries";

const SUB_PAGES: Record<string, string> = {
  edit: "Modifier",
  close: "Clôturer",
  closed: "Séance clôturée",
  start: "Faire cours",
  notebook: "Carnet de séance",
  questions: "Questions liées",
  trombinoscope: "Trombinoscope",
};

/** Fil d'Ariane d'une séance : Modules › SCRUM › Séances › Séance 3 · lun. 17 nov. › Clôturer. */
export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string; courseId: string }>;
}) {
  const { id, courseId } = await params;
  const courses = await getModuleCourses(id);
  const index = courses.findIndex((c) => c.id === courseId);
  const course = courses[index];
  return (
    <>
      {course ? (
        <ObjectCrumbs
          items={[
            {
              label: `Séance ${index + 1}${course.session_date ? ` · ${formatSessionDay(course.session_date)}` : ""}`,
            },
          ]}
          base={`/modules/${id}/courses/${courseId}`}
          subPages={SUB_PAGES}
        />
      ) : null}
      {children}
    </>
  );
}
