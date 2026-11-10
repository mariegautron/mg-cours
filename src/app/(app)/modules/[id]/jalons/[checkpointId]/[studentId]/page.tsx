import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckpointFiles } from "@/components/checkpoints/checkpoint-files";
import { CheckpointForm } from "@/components/checkpoints/checkpoint-form";
import { BackLink } from "@/components/ui/back-link";
import {
  CHECKPOINT_STATUS_LABEL,
  formatCheckpointDate,
  isCheckpointStatus,
} from "@/lib/checkpoints/checkpoints";
import { getCheckpoint, getCheckpointResult, listModuleStudents } from "@/lib/checkpoints/queries";
import { getModule } from "@/lib/modules/queries";
import { parseResourceFiles } from "@/lib/resources/files";

export const metadata: Metadata = { title: "Détail du jalon" };

export default async function CheckpointDetailPage({
  params,
}: PageProps<"/modules/[id]/jalons/[checkpointId]/[studentId]">) {
  const { id, checkpointId, studentId } = await params;
  const [mod, checkpoint, students] = await Promise.all([
    getModule(id),
    getCheckpoint(id, checkpointId),
    listModuleStudents(id),
  ]);
  const student = students.find((s) => s.id === studentId);
  if (!mod || !checkpoint || !student) notFound();
  const result = await getCheckpointResult(checkpointId, studentId);
  const status = isCheckpointStatus(result?.status) ? result.status : "pending";
  const decidedOn = formatCheckpointDate(result?.decided_at?.slice(0, 10));
  const due = formatCheckpointDate(checkpoint.due_date);
  const answer = formatCheckpointDate(checkpoint.response_date);

  return (
    <div className="max-w-3xl space-y-6">
      <BackLink href={`/modules/${mod.id}/jalons`}>Jalons</BackLink>
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">
          {checkpoint.code} · {checkpoint.title}
        </h1>
        <p className="text-lg">
          {student.first_name} {student.last_name}
        </p>
        <p className="text-muted-foreground text-sm">
          {CHECKPOINT_STATUS_LABEL[status]}
          {decidedOn ? ` le ${decidedOn}` : ""}
          {due ? ` · À rendre le ${due}` : ""}
          {answer ? ` · Réponse prévue le ${answer}` : ""}
        </p>
      </header>

      {checkpoint.expected_md ? (
        <section aria-labelledby="expected" className="bg-card rounded-3xl border p-5">
          <h2 id="expected" className="font-heading mb-2 text-lg font-bold">
            Ce que l’école contrôle
          </h2>
          <p className="whitespace-pre-line">{checkpoint.expected_md}</p>
        </section>
      ) : null}

      <section aria-labelledby="files" className="bg-card space-y-3 rounded-3xl border p-5">
        <h2 id="files" className="font-heading text-lg font-bold">
          Fichiers reçus
        </h2>
        <CheckpointFiles
          moduleId={mod.id}
          checkpointId={checkpoint.id}
          studentId={student.id}
          resultId={result?.id ?? null}
          files={parseResourceFiles(result?.files)}
        />
      </section>

      <section aria-label="Suivi du jalon" className="bg-card rounded-3xl border p-5">
        <CheckpointForm
          moduleId={mod.id}
          checkpointId={checkpoint.id}
          studentId={student.id}
          initial={{
            status,
            feedback_md: result?.feedback_md ?? "",
            private_note: result?.private_note ?? "",
          }}
        />
      </section>
    </div>
  );
}
