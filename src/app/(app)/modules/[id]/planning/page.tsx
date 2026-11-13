import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PlanningView } from "@/components/modules/planning-view";
import { Button } from "@/components/ui/button";
import { buildPlanning } from "@/lib/modules/planning";
import { loadPlanning } from "@/lib/modules/planning-queries";

export const metadata: Metadata = { title: "Planning" };

export default async function PlanningPage({ params }: PageProps<"/modules/[id]/planning">) {
  const { id } = await params;
  const data = await loadPlanning(id);
  if (!data) notFound();
  const days = buildPlanning(data.sessions);

  return (
    <div className="mx-auto max-w-[112rem] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Planning</h1>
          <p className="text-muted-foreground mt-1">
            Les jours, les séances et leur déroulé heure par heure.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/modules/${id}/frise`}>Espace étudiant·es</Link>
          </Button>
        </div>
      </div>
      <PlanningView days={days} moduleId={id} />
    </div>
  );
}
