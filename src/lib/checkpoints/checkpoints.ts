import { z } from "zod";

import { RESOURCE_FILES_BUCKET } from "@/lib/resources/files";

/** Jalons : suivi non noté des points de contrôle d'un module (rien n'entre dans une moyenne). */
export const CHECKPOINT_FILES_BUCKET = RESOURCE_FILES_BUCKET;

export const CHECKPOINT_STATUSES = ["pending", "submitted", "validated", "refused"] as const;
export type CheckpointStatus = (typeof CHECKPOINT_STATUSES)[number];

export const CHECKPOINT_STATUS_LABEL: Record<CheckpointStatus, string> = {
  pending: "À rendre",
  submitted: "Rendu",
  validated: "Validé",
  refused: "Refusé",
};

export const FEEDBACK_TEMPLATE = "Décision :\nEn place :\nIl manque :\nProchaine étape :\n";

export function isCheckpointStatus(value: unknown): value is CheckpointStatus {
  return CHECKPOINT_STATUSES.includes(value as CheckpointStatus);
}

export const checkpointResultSchema = z.object({
  status: z.enum(CHECKPOINT_STATUSES),
  feedback_md: z.string().max(10000),
  private_note: z.string().max(10000),
});

/** Chemin Storage d'un fichier reçu d'un·e étudiant·e pour un jalon. */
export function checkpointFilePath(
  ownerId: string,
  checkpointId: string,
  studentId: string,
  timestamp: number,
  safeFileName: string,
) {
  return `${ownerId}/checkpoints/${checkpointId}/${studentId}/${timestamp}-${safeFileName}`;
}

export function checkpointFileUrl(resultId: string, name: string, download = false) {
  return `/api/checkpoints/${resultId}/files?name=${encodeURIComponent(name)}${download ? "&download=1" : ""}`;
}

/** « 20 nov. 2026 » à partir d'une date SQL `YYYY-MM-DD`. */
export function formatCheckpointDate(date: string | null | undefined) {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
