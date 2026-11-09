"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { linkExpectationToCourse } from "@/app/(app)/modules/[id]/courses/actions";

/** « Traité en séance… » : relie directement un attendu sans cours à une séance du module. */
export function LinkExpectationCourse({
  moduleId,
  expectationId,
  label,
  courses,
}: {
  moduleId: string;
  expectationId: string;
  label: string;
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col gap-1">
      <select
        aria-label={`Traité en séance : ${label}`}
        defaultValue=""
        disabled={pending}
        onChange={(e) => {
          const courseId = e.target.value;
          if (!courseId) return;
          start(async () => {
            const res = await linkExpectationToCourse(moduleId, expectationId, courseId);
            setMessage(res.error ?? "Relié.");
            router.refresh();
          });
        }}
        className="border-input bg-background min-h-9 rounded-md border px-2 text-sm"
      >
        <option value="">Traité en séance…</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <span role="status" className="text-muted-foreground text-xs">
        {message}
      </span>
    </span>
  );
}
