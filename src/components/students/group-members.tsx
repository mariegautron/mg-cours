"use client";

import { useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { UserMinus, UserPlus } from "lucide-react";

import { ActionError } from "@/components/action-error";
import { addMembers, removeMember } from "@/app/(app)/modules/[id]/groups/actions";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterStudents } from "@/lib/students/module-groups";
import type { Tables } from "@/types/db";

export function GroupMembers({
  moduleId,
  groupId,
  members,
  candidates,
}: {
  moduleId: string;
  groupId: string;
  members: Tables<"student">[];
  candidates: Tables<"student">[];
}) {
  const [pending, startTransition] = useTransition();
  // Bouton en cours : lui seul affiche l'attente ; les autres sont désactivés le temps de l'envoi
  // (un appui sur une autre personne ne doit pas être perdu en silence, il attend son tour).
  const [busy, setBusy] = useState<string | null>(null);
  const isBusy = (key: string) => pending && busy === key;
  const isBlocked = (key: string) => pending && busy !== key;
  const memberIds = new Set(members.map((m) => m.id));
  const available = candidates.filter((c) => !memberIds.has(c.id));
  const id = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const visible = useMemo(() => filterStudents(available, query), [available, query]);
  const selectedCount = available.filter((c) => selected.has(c.id)).length;

  const toggle = (studentId: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(studentId);
      else next.delete(studentId);
      return next;
    });

  const addSelected = (only?: string[]) => {
    const ids = only ?? available.filter((c) => selected.has(c.id)).map((c) => c.id);
    setError("");
    setMessage("");
    setBusy(only ? `add-${only[0]}` : "add-selection");
    startTransition(async () => {
      const result = await addMembers(moduleId, groupId, ids);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      setMessage(
        `${result.added} étudiant·e${(result.added ?? 0) > 1 ? "s" : ""} ajouté·e·s au groupe.`,
      );
    });
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-medium">Membres ({members.length})</h3>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun membre pour l’instant.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <Link href={`/students/${m.id}`} className="underline underline-offset-2">
                  {m.first_name} {m.last_name}
                </Link>
                <PendingButton
                  type="button"
                  variant="ghost"
                  size="icon"
                  pending={isBusy(`remove-${m.id}`)}
                  pendingLabel="Retrait…"
                  disabled={isBlocked(`remove-${m.id}`)}
                  aria-label={`Retirer ${m.first_name} ${m.last_name} du groupe`}
                  onClick={() => {
                    setBusy(`remove-${m.id}`);
                    startTransition(() => void removeMember(moduleId, groupId, m.id));
                  }}
                >
                  <UserMinus aria-hidden />
                </PendingButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Ajouter</h3>
        {available.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Tou·te·s les étudiant·es sont déjà dans ce groupe, ou{" "}
            <Link href="/students/new" className="underline underline-offset-2">
              crée-en un·e
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor={`${id}-q`}>Rechercher un·e étudiant·e</Label>
              <Input
                id={`${id}-q`}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, prénom, e-mail, numéro…"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={visible.length === 0}
                onClick={() =>
                  setSelected((prev) => new Set([...prev, ...visible.map((c) => c.id)]))
                }
              >
                Tout sélectionner ({visible.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={selectedCount === 0}
                onClick={() => setSelected(new Set())}
              >
                Tout désélectionner
              </Button>
              <PendingButton
                type="button"
                size="sm"
                pending={isBusy("add-selection")}
                pendingLabel="Ajout…"
                disabled={selectedCount === 0 || isBlocked("add-selection")}
                onClick={() => addSelected()}
              >
                Ajouter la sélection ({selectedCount})
              </PendingButton>
            </div>
            <p role="status" className="text-muted-foreground text-sm">
              {visible.length} étudiant·e{visible.length > 1 ? "s" : ""} affiché·e
              {visible.length > 1 ? "s" : ""}
              {message ? ` · ${message}` : ""}
            </p>
            {error ? <ActionError error={error} /> : null}
            {visible.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun·e étudiant·e ne correspond.</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
                {visible.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id={`${id}-s-${c.id}`}
                      checked={selected.has(c.id)}
                      onCheckedChange={(v) => toggle(c.id, v === true)}
                    />
                    <Label htmlFor={`${id}-s-${c.id}`} className="flex-1 font-normal">
                      {c.first_name} {c.last_name}
                    </Label>
                    <PendingButton
                      type="button"
                      variant="ghost"
                      size="icon"
                      pending={isBusy(`add-${c.id}`)}
                      pendingLabel="Ajout…"
                      disabled={isBlocked(`add-${c.id}`)}
                      aria-label={`Ajouter ${c.first_name} ${c.last_name} au groupe`}
                      onClick={() => addSelected([c.id])}
                    >
                      <UserPlus aria-hidden />
                    </PendingButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
