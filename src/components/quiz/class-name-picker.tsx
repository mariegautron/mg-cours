"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterNames, type ClassName } from "@/lib/quiz/class-access";

/** Liste des noms encore libres : on tape pour filtrer, on choisit son nom. Un bouton par nom (clavier). */
export function ClassNamePicker({
  names,
  action,
}: {
  names: ClassName[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const shown = filterNames(names, query);

  if (names.length === 0) {
    return (
      <p role="status" className="rounded-md border p-4 text-sm">
        Tous les noms sont pris. Si le tien manque, préviens ton enseignante.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name-filter">Chercher mon nom</Label>
        <Input
          id="name-filter"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
        {shown.length} nom{shown.length > 1 ? "s" : ""} disponible{shown.length > 1 ? "s" : ""}
      </p>
      <ul className="space-y-2">
        {shown.map((n) => (
          <li key={n.id}>
            <form action={action}>
              <input type="hidden" name="attemptId" value={n.id} />
              <button
                type="submit"
                className="hover:bg-accent focus-visible:ring-ring min-h-12 w-full rounded-lg border px-4 text-left text-base font-medium focus-visible:ring-2 focus-visible:outline-none"
              >
                {n.name}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
