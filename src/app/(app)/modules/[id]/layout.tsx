import { ModuleSubnav } from "@/components/modules/module-subnav";
import { nextStepButton } from "@/lib/modules/journey";
import { getModuleJourney } from "@/lib/modules/journey-queries";
import { getModule } from "@/lib/modules/queries";

export default async function ModuleLayout({ children, params }: LayoutProps<"/modules/[id]">) {
  const { id } = await params;
  const mod = await getModule(id);
  // Module introuvable : la page affiche « page introuvable ».
  if (!mod) return children;
  const journey = await getModuleJourney(id);

  return (
    <>
      <ModuleSubnav
        moduleId={mod.id}
        moduleName={mod.name}
        archived={!!mod.archived_at}
        next={journey ? nextStepButton(journey) : null}
      />
      {children}
    </>
  );
}
