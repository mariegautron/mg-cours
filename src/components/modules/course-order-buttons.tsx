"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { moveCourse } from "@/app/(app)/modules/[id]/courses/actions";

/** Monter / descendre la séance dans le module (US-61), annoncé aux lecteurs d'écran. */
export function CourseOrderButtons({
  moduleId,
  courseId,
  title,
  index,
  total,
}: {
  moduleId: string;
  courseId: string;
  title: string;
  index: number;
  total: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const go = (dir: "up" | "down") =>
    start(async () => {
      const r = await moveCourse(moduleId, courseId, dir);
      setNote(r.error ?? `« ${title} » est maintenant la séance ${r.position} sur ${r.total}.`);
      router.refresh();
    });
  const cls =
    "hover:bg-accent focus-visible:ring-ring min-h-11 min-w-11 rounded-xl border p-2 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40";
  return (
    <>
      <button
        type="button"
        className={cls}
        disabled={pending || index === 0}
        onClick={() => go("up")}
        aria-label={`Monter la séance ${index + 1}`}
      >
        <ArrowUp aria-hidden className="mx-auto size-4" />
      </button>
      <button
        type="button"
        className={cls}
        disabled={pending || index === total - 1}
        onClick={() => go("down")}
        aria-label={`Descendre la séance ${index + 1}`}
      >
        <ArrowDown aria-hidden className="mx-auto size-4" />
      </button>
      <span role="status" className="sr-only">
        {note}
      </span>
    </>
  );
}
