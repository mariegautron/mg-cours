import { ModuleNavRegister } from "@/components/modules/module-nav-context";
import { ModulePhases } from "@/components/modules/module-phases";
import { ModuleSubnav } from "@/components/modules/module-subnav";
import { modulePhase } from "@/lib/modules/phases";
import { todayInParis } from "@/lib/modules/next-session";
import { getModule, getModuleCourses } from "@/lib/modules/queries";

export default async function ModuleLayout({ children, params }: LayoutProps<"/modules/[id]">) {
  const { id } = await params;
  const mod = await getModule(id);
  // Module introuvable : la page affiche « page introuvable ».
  if (!mod) return children;
  // Fil de phase (lot N4), sous le fil d'Ariane de chaque page du module.
  const courses = await getModuleCourses(id);
  const closed = !!(mod.archived_at || mod.finished_at);
  const current = modulePhase({ today: todayInParis(), closed, courses });

  return (
    <>
      <ModuleNavRegister id={mod.id} name={mod.name} />
      <ModulePhases
        moduleId={mod.id}
        current={current}
        done={{
          prepare: current !== "prepare",
          teach: current === "close",
          close: closed,
        }}
      />
      <ModuleSubnav moduleId={mod.id} />
      {children}
    </>
  );
}
