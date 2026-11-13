import { RouteLoadingMarker } from "@/components/navigation-status";
import { Skeleton } from "@/components/ui/skeleton";

/** Chargement de la page « Bibliothèque » : le titre s'affiche tout de suite, la liste suit (lot 6, point 34). */
export default function Loading() {
  return (
    <div className="space-y-4" data-slot="page-skeleton">
      <RouteLoadingMarker />
      <h1 className="text-xl">Bibliothèque</h1>
      <div aria-hidden className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
