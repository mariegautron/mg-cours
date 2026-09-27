import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { KIND_LABELS, type ResourceAudience, type ResourceKind } from "@/lib/resources/kind";

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
