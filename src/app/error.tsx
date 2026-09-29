"use client";

import { RouteError } from "@/components/route-error";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <RouteError error={error} retry={retry} />
    </main>
  );
}
