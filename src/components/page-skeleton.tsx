import { RouteLoadingMarker } from "@/components/navigation-status";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de page (titre + 3 blocs) affiché par les `loading.tsx` pendant le chargement d'une
 * route. Purement décoratif (`aria-hidden`) : c'est `NavigationStatusProvider` qui annonce
 * « Chargement… » une seule fois, via `RouteLoadingMarker`.
 */
export function PageSkeleton({ className = "max-w-3xl" }: { className?: string }) {
  return (
    <div aria-hidden className={`${className} space-y-6`} data-slot="page-skeleton">
      <RouteLoadingMarker />
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3 max-w-sm" />
        <Skeleton className="h-4 w-1/2 max-w-xs" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
