"use client";

import { useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { createResourceInline } from "@/app/(app)/resources/actions";
import { AudienceBadge, StatusBadge } from "@/components/resources/resource-badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LinkedResource } from "@/lib/modules/queries";
import { splitRetained } from "@/lib/modules/retained";
import { groupByKind, KIND_LABELS, RESOURCE_KINDS, type ResourceKind } from "@/lib/resources/kind";
import {
  filterPickerResources,
  NO_PICKER_FILTERS,
  pickerCategories,
  type PickerFilters,
} from "@/lib/resources/picker";

const SELECT_CLASS = "border-input h-9 rounded-md border bg-transparent px-3 text-sm";

/**
 * US-62 : liens ressources d'une séance sans quitter le formulaire — recherche, filtres (type,
 * matière, retenues du module), groupement par type, création inline. La sélection est conservée
 * quand un filtre masque une ressource ; la première sélectionnée est la ressource principale.
 */
export function ResourcePicker({
  resources,
  retainedIds,
  initialSelected,
}: {
  resources: LinkedResource[];
  retainedIds: string[];
  initialSelected: string[];
}) {
  const id = useId();
  const [items, setItems] = useState(resources);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [filters, setFilters] = useState<PickerFilters>(NO_PICKER_FILTERS);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftKind, setDraftKind] = useState<ResourceKind>("workshop");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const retained = useMemo(() => new Set(retainedIds), [retainedIds]);
  const categories = useMemo(() => pickerCategories(items), [items]);
  const visible = useMemo(
    () => filterPickerResources(items, filters, retained),
    [items, filters, retained],
  );
  const groups = useMemo(() => {
    const split = splitRetained(visible, retained);
    return [
      ...(split.retained.length
        ? [{ key: "retained", label: "Retenues du module", items: split.retained }]
        : []),
      ...groupByKind(split.others),
    ];
  }, [visible, retained]);
  const byId = useMemo(() => new Map(items.map((r) => [r.id, r])), [items]);

  const toggle = (resourceId: string, on: boolean) =>
    setSelected((prev) =>
      on
        ? prev.includes(resourceId)
          ? prev
          : [...prev, resourceId]
        : prev.filter((x) => x !== resourceId),
    );

  const create = () => {
    setError("");
    startTransition(async () => {
      const result = await createResourceInline({ title: draftTitle, kind: draftKind });
      if (result.error || !result.resource) {
        setError(result.error ?? "Création impossible.");
        return;
      }
      const created = result.resource;
      setItems((prev) => [created, ...prev]);
      setSelected((prev) => [...prev, created.id]);
      setDraftTitle("");
      setMessage(`« ${created.title} » créée (à construire) et liée à la séance.`);
    });
  };

  const set = (patch: Partial<PickerFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Ressources utilisées</legend>
      {selected.map((rid) => (
        <input key={rid} type="hidden" name="resourceIds" value={rid} />
      ))}

      <div
        className="flex flex-wrap items-end gap-3"
        role="search"
        aria-label="Filtrer les ressources"
      >
        <div className="space-y-1">
          <Label htmlFor={`${id}-q`}>Rechercher une ressource</Label>
          <Input
            id={`${id}-q`}
            type="search"
            value={filters.q}
            onChange={(e) => {
              e.stopPropagation(); // filtrer n'est pas une modification de la séance
              set({ q: e.target.value });
            }}
            placeholder="Titre…"
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-kind`}>Type</Label>
          <select
            id={`${id}-kind`}
            className={SELECT_CLASS}
            value={filters.kind}
            onChange={(e) => {
              e.stopPropagation();
              set({ kind: e.target.value as PickerFilters["kind"] });
            }}
          >
            <option value="">Tous</option>
            {RESOURCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
            <option value="none">Non classées</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-category`}>Matière</Label>
          <select
            id={`${id}-category`}
            className={SELECT_CLASS}
            value={filters.category}
            onChange={(e) => {
              e.stopPropagation();
              set({ category: e.target.value });
            }}
          >
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {retained.size ? (
          <div className="flex h-9 items-center gap-2">
            <Checkbox
              id={`${id}-retained`}
              checked={filters.retainedOnly}
              onCheckedChange={(v) => set({ retainedOnly: v === true })}
            />
            <Label htmlFor={`${id}-retained`} className="font-normal">
              Retenues du module
            </Label>
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className="text-muted-foreground text-sm">
        {visible.length} ressource{visible.length > 1 ? "s" : ""} affichée
        {visible.length > 1 ? "s" : ""} · {selected.length} liée{selected.length > 1 ? "s" : ""} à
        la séance
      </p>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucune ressource disponible — créez-en une ci-dessous ou depuis{" "}
          <Link href="/resources/new" className="underline underline-offset-2">
            Ressources
          </Link>
          .
        </p>
      ) : groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucune ressource ne correspond à ces filtres.
        </p>
      ) : (
        <div className="max-h-80 space-y-4 overflow-y-auto rounded-md border p-3">
          {groups.map((group) => (
            <fieldset key={group.key} className="space-y-2">
              <legend className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {group.label}
              </legend>
              <ul className="space-y-2">
                {group.items.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`${id}-resource-${r.id}`}
                      checked={selected.includes(r.id)}
                      onCheckedChange={(v) => toggle(r.id, v === true)}
                    />
                    <Label htmlFor={`${id}-resource-${r.id}`} className="font-normal">
                      {r.title}
                    </Label>
                    <AudienceBadge audience={r.audience} />
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>
      )}

      {selected.length ? (
        <p className="text-sm">
          <span className="font-medium">Liées :</span>{" "}
          {selected
            .map(
              (rid, i) => `${byId.get(rid)?.title ?? "Ressource"}${i === 0 ? " (principale)" : ""}`,
            )
            .join(" · ")}
        </p>
      ) : null}

      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">Créer une ressource</summary>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor={`${id}-draft-title`}>Titre de la nouvelle ressource</Label>
            <Input
              id={`${id}-draft-title`}
              value={draftTitle}
              maxLength={200}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (draftTitle.trim() && !pending) create();
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-draft-kind`}>Type de la nouvelle ressource</Label>
            <select
              id={`${id}-draft-kind`}
              className={SELECT_CLASS}
              value={draftKind}
              onChange={(e) => setDraftKind(e.target.value as ResourceKind)}
            >
              {RESOURCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={create}
            disabled={pending || !draftTitle.trim()}
          >
            Créer et lier
          </Button>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          Créée « À construire » (jamais projetée) : complétez-la ensuite dans Ressources.
        </p>
        {error ? (
          <p role="alert" className="text-destructive mt-2 text-sm">
            {error}
          </p>
        ) : null}
        <p aria-live="polite" className="mt-2 text-sm">
          {message}
        </p>
      </details>
    </fieldset>
  );
}
