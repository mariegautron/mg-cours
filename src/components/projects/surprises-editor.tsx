"use client";

import { useActionState, useState, useTransition } from "react";

import {
  addSurprise,
  deleteSurprise,
  setSurpriseSent,
  updateSurprise,
  type SurpriseState,
} from "@/app/(app)/modules/[id]/project/surprise-actions";
import { ActionError } from "@/components/action-error";
import { CopyMessageButton } from "@/components/projects/copy-message-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import { copyText, deliveryLabel, type Surprise } from "@/lib/projects/surprises";

interface CourseOption {
  id: string;
  number: number;
  title: string;
}

function CourseSelect({
  id,
  courses,
  value,
}: {
  id: string;
  courses: CourseOption[];
  value: string;
}) {
  return (
    <select
      id={id}
      name="courseId"
      defaultValue={value}
      className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
    >
      <option value="">Pas de séance choisie</option>
      {courses.map((c) => (
        <option key={c.id} value={c.id}>
          Séance {c.number} : {c.title}
        </option>
      ))}
    </select>
  );
}

function Row({
  moduleId,
  item,
  courses,
  order,
}: {
  moduleId: string;
  item: Surprise;
  courses: CourseOption[];
  order: Map<string, number>;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: SurpriseState, fd: FormData) => {
    const res = await updateSurprise(moduleId, item.id, prev, fd);
    if (res.saved) setEditing(false);
    return res;
  }, {});
  const [other, setOther] = useState<SurpriseState>({});
  const [busy, start] = useTransition();

  return (
    <li className="space-y-2 rounded-lg border p-3">
      {editing ? (
        <form action={action} className="space-y-2">
          <Label htmlFor={`t-${item.id}`}>Titre de l’imprévu</Label>
          <Input
            id={`t-${item.id}`}
            name="title"
            defaultValue={item.title}
            maxLength={200}
            required
          />
          <Label htmlFor={`c-${item.id}`}>Envoyé pendant</Label>
          <CourseSelect id={`c-${item.id}`} courses={courses} value={item.courseId ?? ""} />
          <Label htmlFor={`b-${item.id}`}>Message prêt à copier</Label>
          <Textarea
            id={`b-${item.id}`}
            name="body"
            rows={5}
            defaultValue={item.body}
            maxLength={5000}
          />
          <div className="flex gap-2">
            <PendingButton type="submit" size="sm" pending={pending} pendingLabel="Enregistrement…">
              Enregistrer
            </PendingButton>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
          {state.error ? <ActionError error={state.error} /> : null}
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground text-sm">
                {deliveryLabel(item.courseId, order)}{" "}
                {item.sentAt ? (
                  <Badge variant="secondary">Envoyé</Badge>
                ) : (
                  <Badge variant="outline">À envoyer</Badge>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CopyMessageButton text={copyText(item)} label={item.title} />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                aria-label={`${item.sentAt ? "Remettre à envoyer" : "Marquer comme envoyé"} : ${item.title}`}
                onClick={() =>
                  start(async () =>
                    setOther(await setSurpriseSent(moduleId, item.id, !item.sentAt)),
                  )
                }
              >
                {item.sentAt ? "Remettre à envoyer" : "Marquer envoyé"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                aria-label={`Modifier l’imprévu : ${item.title}`}
                onClick={() => setEditing(true)}
              >
                Modifier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                aria-label={`Supprimer l’imprévu : ${item.title}`}
                onClick={() => start(async () => setOther(await deleteSurprise(moduleId, item.id)))}
              >
                Supprimer
              </Button>
            </div>
          </div>
          {item.body ? (
            <p className="bg-muted/40 rounded-md p-2 text-sm whitespace-pre-wrap">{item.body}</p>
          ) : null}
          {other.error ? <ActionError error={other.error} /> : null}
        </>
      )}
    </li>
  );
}

/** Imprévus du client (US-128) : mails planifiés entre les séances, prêts à copier. */
export function SurprisesEditor({
  moduleId,
  items,
  courses,
  available,
}: {
  moduleId: string;
  items: Surprise[];
  courses: CourseOption[];
  available: boolean;
}) {
  const [state, action, pending] = useActionState(addSurprise.bind(null, moduleId), {});
  const order = new Map(courses.map((c) => [c.id, c.number]));
  if (!available) {
    return (
      <p className="text-sm">
        Les imprévus du client seront disponibles après la mise à jour de la base de données.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun imprévu planifié.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <Row key={i.id} moduleId={moduleId} item={i} courses={courses} order={order} />
          ))}
        </ul>
      )}
      <form
        key={items.length}
        action={action}
        className="space-y-2 rounded-lg border border-dashed p-3"
      >
        <h3 className="font-medium">Ajouter un imprévu</h3>
        <Label htmlFor="surprise-title">Titre</Label>
        <Input
          id="surprise-title"
          name="title"
          maxLength={200}
          required
          placeholder="Ex. Le budget est réduit de moitié"
        />
        <Label htmlFor="surprise-course">À envoyer pendant</Label>
        <CourseSelect id="surprise-course" courses={courses} value="" />
        <Label htmlFor="surprise-body">Message prêt à copier</Label>
        <Textarea
          id="surprise-body"
          name="body"
          rows={5}
          maxLength={5000}
          placeholder="Bonjour, suite à notre réunion…"
        />
        <PendingButton type="submit" pending={pending} pendingLabel="Ajout…">
          Ajouter l’imprévu
        </PendingButton>
        {state.error ? <ActionError error={state.error} /> : null}
      </form>
    </div>
  );
}
