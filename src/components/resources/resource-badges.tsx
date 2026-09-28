import { Hammer, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  KIND_LABELS,
  STATUS_LABELS,
  type ResourceAudience,
  type ResourceKind,
  type ResourceStatus,
} from "@/lib/resources/kind";

export function KindBadge({ kind }: { kind: ResourceKind | null }) {
  return kind ? (
    <Badge variant="secondary">{KIND_LABELS[kind]}</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground border-dashed">
      Type à définir
    </Badge>
  );
}

/** Repère textuel (pas seulement une couleur) des ressources jamais diffusées aux étudiant·es. */
export function AudienceBadge({ audience }: { audience: ResourceAudience }) {
  if (audience !== "teacher") return null;
  return (
    <Badge variant="outline" className="border-coral text-coral">
      <Lock aria-hidden />
      Enseignante uniquement
    </Badge>
  );
}

/** Repère textuel des ressources encore à écrire : elles ne sont jamais projetées. */
export function StatusBadge({ status }: { status: ResourceStatus }) {
  if (status === "ready") return null;
  return (
    <Badge variant="outline" className="border-dashed">
      <Hammer aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
