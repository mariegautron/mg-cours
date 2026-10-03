import { redirect } from "next/navigation";

/** Ancienne adresse : tout se gère désormais depuis « Donner accès au QCM ». */
export default async function QuizQrPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/quiz/qr">) {
  const { id, assessmentId } = await params;
  redirect(`/modules/${id}/assessments/${assessmentId}/quiz/links`);
}
