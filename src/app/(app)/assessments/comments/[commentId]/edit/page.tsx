import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateComment } from "@/app/(app)/assessments/comments/actions";
import { CommentForm } from "@/components/assessments/comment-form";
import { getComment } from "@/lib/assessments/queries";

export const metadata: Metadata = { title: "Modifier le commentaire" };

export default async function EditCommentPage({
  params,
}: PageProps<"/assessments/comments/[commentId]/edit">) {
  const { commentId } = await params;
  const comment = await getComment(commentId);
  if (!comment) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Modifier le commentaire</h1>
      <CommentForm action={updateComment.bind(null, commentId)} comment={comment} />
    </div>
  );
}
