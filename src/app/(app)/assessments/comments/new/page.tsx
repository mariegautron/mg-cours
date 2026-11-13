import type { Metadata } from "next";

import { createComment } from "@/app/(app)/assessments/comments/actions";
import { CommentForm } from "@/components/assessments/comment-form";

export const metadata: Metadata = { title: "Nouvelle phrase" };

export default function NewCommentPage() {
  return (
    <div className="space-y-6">
      <h1>Nouvelle phrase</h1>
      <CommentForm action={createComment} />
    </div>
  );
}
