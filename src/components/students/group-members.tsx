"use client";

import { useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { UserMinus, UserPlus } from "lucide-react";

import { ActionError } from "@/components/action-error";
import {
  addMembers,
  createAndAddMember,
  removeMember,
} from "@/app/(app)/modules/[id]/groups/actions";
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
  moduleStudentIds = [],
  leftIds = [],
}: {
  moduleId: string;
  groupId: string;
  members: Tables<"student">[];
  candidates: Tables<"student">[];
  /** Personnes déjà dans un groupe du module : proposées d'abord. */
  moduleStudentIds?: string[];
  /** Parti·es du module : grisé·es, « a quitté le module ». */
  leftIds?: string[];
}) {
  const [pending, startTransition] = useTransition();
  // Bouton en cours : lui seul affiche l'attente ; les autres sont désactivés le temps de l'envoi
  // (un appui sur une autre personne ne doit pas être perdu en silence, il attend son tour).
  const [busy, setBusy] = useState<string | null>(null);
  const isBusy = (key: string) => pending && busy === key;
  const isBlocked = (key: string) => pending && busy !== key;
  const memberIds = new Set(members.map((m) => m.id));
  const inModule = new Set(moduleStudentIds);
  const moduleAvailable = candidates.filter((c) => inModule.has(c.id) && !memberIds.has(c.id));
  // Personne d'autre dans le module : on part de toute la base.
  const [showAll, setShowAll] = useState(moduleAvailable.length === 0);
  const available = showAll ? candidates.filter((c) => !memberIds.has(c.id)) : moduleAvailable;
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
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
        <h3 className="mb-2 text-sm font-semibold">
          Membres ({members.filter((m) => !leftIds.includes(m.id)).length})
        </h3>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun membre pour l’instant.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <Link
                  href={`/students/${m.id}`}
                  className={`underline underline-offset-2 ${leftIds.includes(m.id) ? "opacity-60" : ""}`}
                >
                  {m.first_name} {m.last_name}
                  {leftIds.includes(m.id) ? (
                    <span className="text-muted-foreground"> · a quitté le module</span>
                  ) : null}
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
        <h3 className="mb-2 text-sm font-semibold">Ajouter</h3>
        {created ? (
          <p role="status" className="mb-2 rounded-md border p-2 text-sm">
            {created.name} ajouté·e au groupe. Pense à lui créer son lien d’espace étudiant·e :{" "}
            <Link href={`/students/${created.id}`} className="underline underline-offset-2">
              créer le lien
            </Link>
            .
          </p>
        ) : null}
        {!showAll ? (
          <Button
            type="button"
            size="sm"
            variant="link"
            className="mb-2 h-auto px-0"
            onClick={() => setShowAll(true)}
          >
            Ajouter quelqu’un d’une autre promo
          </Button>
        ) : null}
        {available.length === 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Tout le monde est déjà dans ce groupe. Une personne arrive en cours de module ?
            </p>
            <NewMemberForm
              moduleId={moduleId}
              groupId={groupId}
              initial=""
              onCreated={(c) => setCreated(c)}
            />
          </div>
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
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">Aucun·e étudiant·e ne correspond.</p>
                {!showAll ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAll(true)}
                  >
                    Chercher dans les autres promos
                  </Button>
                ) : null}
                <NewMemberForm
                  key={query}
                  moduleId={moduleId}
                  groupId={groupId}
                  initial={query}
                  onCreated={(c) => {
                    setCreated(c);
                    setQuery("");
                  }}
                />
              </div>
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

/** Coupe « Prénom NOM » tapé dans la recherche pour préremplir le formulaire. */
function guessName(text: string): { firstName: string; lastName: string } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return { firstName: words[0] ?? "", lastName: "" };
  const upper = words.filter((w) => w.length > 1 && w === w.toUpperCase());
  if (upper.length > 0 && upper.length < words.length) {
    return {
      firstName: words.filter((w) => !upper.includes(w)).join(" "),
      lastName: upper.join(" "),
    };
  }
  return { firstName: words[0], lastName: words.slice(1).join(" ") };
}

/** Arrivant·e tardif·ve : fiche créée et ajoutée au groupe en un clic. */
export function NewMemberForm({
  moduleId,
  groupId,
  initial,
  onCreated,
}: {
  moduleId: string;
  /** `null` : inscription au module seulement. */
  groupId: string | null;
  initial: string;
  onCreated: (created: { id: string; name: string }) => void;
}) {
  const id = useId();
  const guess = guessName(initial);
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(guess.firstName);
  const [lastName, setLastName] = useState(guess.lastName);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden />
        {initial.trim()
          ? `Créer « ${initial.trim()} » et l’ajouter ${groupId ? "au groupe" : "au module"}`
          : "Ajouter une personne"}
      </Button>
    );
  }
  return (
    <form
      className="space-y-2 rounded-md border p-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        startTransition(async () => {
          const result = await createAndAddMember(moduleId, groupId, {
            firstName,
            lastName,
            email,
          });
          if (result.error || !result.studentId) {
            setError(result.error ?? "Ajout impossible.");
            return;
          }
          onCreated({ id: result.studentId, name: result.name ?? `${firstName} ${lastName}` });
          setOpen(false);
        });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-fn`}>Prénom</Label>
          <Input
            id={`${id}-fn`}
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-ln`}>Nom</Label>
          <Input
            id={`${id}-ln`}
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${id}-em`}>E-mail (facultatif)</Label>
        <Input
          id={`${id}-em`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error ? <ActionError error={error} /> : null}
      <div className="flex gap-2">
        <PendingButton type="submit" size="sm" pending={pending} pendingLabel="Ajout…">
          {groupId ? "Créer et ajouter au groupe" : "Créer et inscrire au module"}
        </PendingButton>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
