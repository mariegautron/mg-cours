import type { Metadata } from "next";
import Link from "next/link";

import { createModule } from "@/app/(app)/modules/actions";
import { ModuleCreateWizard } from "@/components/modules/create/module-create-wizard";
import { listSchools } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Nouveau module" };

export default async function NewModulePage() {
  const schools = await listSchools();
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <nav aria-label="Fil d’Ariane" className="text-muted-foreground text-sm">
        <Link href="/modules" className="underline-offset-2 hover:underline">
          Modules
        </Link>{" "}
        › <span className="text-foreground font-semibold">Nouveau module</span>
      </nav>
      <ModuleCreateWizard action={createModule} schools={schools} />
    </div>
  );
}
