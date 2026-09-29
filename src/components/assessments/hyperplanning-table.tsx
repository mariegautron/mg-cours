import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HyperplanningRow } from "@/lib/assessments/hyperplanning";

/** Notes sur 20 à recopier dans Hyperplanning (US-100) : jamais envoyé, jamais montré aux étudiant·es. */
export function HyperplanningTable({
  moduleId,
  assessmentId,
  rows,
}: {
  moduleId: string;
  assessmentId: string;
  rows: HyperplanningRow[];
}) {
  return (
    <section aria-labelledby="hyperplanning" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="hyperplanning" className="text-lg font-medium">
          À saisir dans Hyperplanning
        </h2>
        <Button asChild size="sm" variant="secondary">
          <a href={`/api/modules/${moduleId}/assessments/${assessmentId}/hyperplanning`}>
            <Download aria-hidden />
            Télécharger (CSV)
          </a>
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <caption className="sr-only">Notes sur 20 à saisir dans Hyperplanning</caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className="p-2">
                Nom
              </th>
              <th scope="col" className="p-2">
                Prénom
              </th>
              <th scope="col" className="p-2">
                Note /20
              </th>
              <th scope="col" className="p-2">
                Remarque
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.lastName}-${r.firstName}`} className="border-t">
                <td className="p-2">{r.lastName}</td>
                <td className="p-2">{r.firstName}</td>
                <td className="p-2 font-medium">{r.grade ?? "—"}</td>
                <td className="text-muted-foreground p-2">{r.remark ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
