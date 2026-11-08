"use client";

import Link from "next/link";
import { useState } from "react";

import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";

export interface OverviewRow {
  id: string;
  firstName: string;
  lastName: string;
  participation: number;
  question: number;
  difficulty: number;
  other: number;
  total: number;
  /** Moyenne du module sur 20, ou `null` sans note. */
  average: number | null;
  /** « À écrire », « Écrite », « Trop longue » (ou « Proposé, à relire »). */
  appreciation: string;
  appreciationTone: "ok" | "warn" | "lock";
}

type SortKey = "name" | "participation" | "question" | "difficulty" | "other" | "total" | "average";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "participation", label: "Participation" },
  { key: "question", label: "Questions" },
  { key: "difficulty", label: "Difficultés" },
  { key: "other", label: "Autres" },
  { key: "total", label: "Observations" },
  { key: "average", label: "Moyenne" },
];

/** Vue de classe : une ligne par personne, une colonne par étiquette, tri au clic. Privée, jamais projetée. */
export function ClassOverview({ moduleId, rows }: { moduleId: string; rows: OverviewRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const sorted = [...rows].sort((a, b) => {
    if (sort.key === "name")
      return (
        sort.dir *
        (a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"))
      );
    return (
      sort.dir * ((a[sort.key] ?? -1) - (b[sort.key] ?? -1)) ||
      a.lastName.localeCompare(b.lastName, "fr")
    );
  });
  const toggle = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 },
    );
  const ariaSort = (key: SortKey) =>
    sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Observations par personne et par étiquette, avec l’état de l’appréciation
        </caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" aria-sort={ariaSort("name")} className="py-1 pr-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => toggle("name")}>
                Nom
              </Button>
            </th>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={ariaSort(c.key)}
                className="px-1 py-1 text-right"
              >
                <Button type="button" variant="ghost" size="sm" onClick={() => toggle(c.key)}>
                  {c.label}
                </Button>
              </th>
            ))}
            <th scope="col" className="px-2 py-1">
              Appréciation
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((r) => (
            <tr key={r.id}>
              <th scope="row" className="py-2 pr-2 text-left font-medium">
                <Link
                  href={`/students/${r.id}#observations`}
                  className="underline underline-offset-2"
                >
                  {r.lastName.toLocaleUpperCase("fr-FR")} {r.firstName}
                </Link>
              </th>
              {COLUMNS.map((c) => (
                <td key={c.key} className="px-3 py-2 text-right tabular-nums">
                  {c.key === "average"
                    ? r.average === null
                      ? "—"
                      : r.average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })
                    : r[c.key as Exclude<SortKey, "name" | "average">]}
                </td>
              ))}
              <td className="px-2 py-2">
                <Link href={`/modules/${moduleId}/appreciations/${r.id}`}>
                  <Pill tone={r.appreciationTone}>{r.appreciation}</Pill>
                  <span className="sr-only">
                    {" "}
                    : ouvrir l’appréciation de {r.firstName} {r.lastName}
                  </span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
