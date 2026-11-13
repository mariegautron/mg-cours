"use client";

import { useState, useTransition, type ReactNode } from "react";

import {
  createStudentLinks,
  revokeStudentLink,
  revokeStudentLinks,
  sendStudentLinksEmail,
  type SendLinksState,
  type StudentLinksState,
} from "@/app/(app)/modules/[id]/frise/student-links";
import { ActionError } from "@/components/action-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { StudentLinkRow } from "@/lib/modules/frise-queries";

/** Lien créé dans cette session : le jeton n'est plus relisible après, donc gardé ici seulement. */
interface Held {
  name: string;
  url: string;
  message: string;
}

const frDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

/** « Anne, Karim et 3 autres » : nomme les personnes concernées dans une confirmation. */
export function namesOf(names: string[]): string {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} et ${names.length - 3} autres`;
}

export function Confirm({
  trigger,
  title,
  description,
  action,
  disabled,
  onConfirm,
  variant = "outline",
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  action: string;
  disabled?: boolean;
  onConfirm: () => void;
  variant?: "outline" | "secondary" | "ghost" | "default";
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="touch" variant={variant} disabled={disabled}>
          {trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function statusOf(r: StudentLinkRow): string {
  if (!r.hasLink) return "Pas de lien";
  if (r.firstViewedAt) {
    return `Ouvert le ${frDate(r.firstViewedAt)} (${r.viewCount} vue${r.viewCount > 1 ? "s" : ""})`;
  }
  if (r.sentAt) return `Lien envoyé le ${frDate(r.sentAt)}, pas encore ouvert`;
  if (r.sendError) return `Envoi échoué : ${r.sendError}`;
  return "Lien créé, pas encore ouvert";
}

/**
 * Liens personnels de l'espace : une ligne par personne, sur le modèle de « Envoyer les résultats ».
 * Un lien ne s'affiche qu'à sa création (seul son haché est gardé) : « Copier le message » et « Copier
 * le lien » ne sont donc disponibles que juste après. Toute action qui coupe un accès demande confirmation.
 */
export function StudentLinksPanel({
  moduleId,
  available,
  students,
  active,
  rows,
}: {
  moduleId: string;
  available: boolean;
  students: number;
  active: number;
  rows: StudentLinkRow[];
}) {
  const [pending, start] = useTransition();
  const [held, setHeld] = useState<Record<string, Held>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState<SendLinksState>({});

  if (!available) {
    return (
      <p className="text-muted-foreground border-t pt-4 text-sm">
        Les liens personnels seront disponibles après la mise à jour de la base de données.
      </p>
    );
  }

  const apply = (res: StudentLinksState, ok: string) => {
    if (res.error) {
      setError(res.error);
      return;
    }
    setError("");
    if (res.links?.length) {
      setHeld((h) => ({
        ...h,
        ...Object.fromEntries(
          res.links!.map((l) => [l.studentId, { name: l.name, url: l.url, message: l.message }]),
        ),
      }));
    }
    setNote(ok);
  };

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNote(`${label} copié.`);
    } catch {
      setNote("Copie impossible depuis ce navigateur : sélectionne le texte à la main.");
    }
  }

  const withLink = rows.filter((r) => r.hasLink);
  const missing = rows.filter((r) => !r.hasLink);
  const heldList = rows.filter((r) => held[r.studentId]);
  const dropHeld = (id: string) =>
    setHeld((h) => {
      const next = { ...h };
      delete next[id];
      return next;
    });

  return (
    <div className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold">Liens personnels</h3>
      <p className="text-muted-foreground text-sm">
        Un lien par étudiant·e : prénom, notes et corrigés publiés pour elle ou lui, et le même
        contenu que ci-dessus (publie-le d’abord). {active} lien{active > 1 ? "s" : ""} actif
        {active > 1 ? "s" : ""} sur {students} étudiant·e{students > 1 ? "s" : ""}.
      </p>
      <p role="note" className="bg-muted rounded-xl border p-3 text-sm">
        <strong>Un lien ne s’affiche qu’une fois</strong>, à sa création : copie-le tout de suite («
        Copier le message » est prêt pour Teams). Si quelqu’un le perd, crée-lui un nouveau lien.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="touch"
          disabled={pending || missing.length === 0}
          onClick={() =>
            start(async () => apply(await createStudentLinks(moduleId, true), "Liens créés."))
          }
        >
          Créer les liens manquants{missing.length ? ` (${missing.length})` : ""}
        </Button>
        <Button
          type="button"
          size="touch"
          variant="secondary"
          disabled={heldList.length === 0}
          onClick={() =>
            void copy(
              heldList.map((r) => `${r.name} : ${held[r.studentId].url}`).join("\n"),
              "Tous les liens",
            )
          }
        >
          Copier tous les liens{heldList.length ? ` (${heldList.length})` : ""}
        </Button>
        <Confirm
          trigger="Tout renouveler"
          title="Renouveler tous les liens ?"
          description={`Les liens actuels de ${namesOf(withLink.map((r) => r.name))} cesseront de fonctionner : chacun·e devra recevoir son nouveau lien.`}
          action="Tout renouveler"
          disabled={pending || students === 0 || withLink.length === 0}
          onConfirm={() =>
            start(async () =>
              apply(await createStudentLinks(moduleId, false), "Tous les liens sont renouvelés."),
            )
          }
        />
        <Confirm
          trigger="Tout dépublier"
          variant="secondary"
          title="Retirer l’accès à tout le monde ?"
          description={`Les liens de ${namesOf(withLink.map((r) => r.name))} cesseront de fonctionner. Leurs résultats publiés ne seront plus visibles par ce lien.`}
          action="Tout dépublier"
          disabled={pending || active === 0}
          onConfirm={() =>
            start(async () => {
              const res = await revokeStudentLinks(moduleId);
              if (!res.error) setHeld({});
              apply(res, "Tous les accès sont retirés.");
            })
          }
        />
      </div>

      {rows.length ? (
        <ul className="divide-y rounded-xl border text-sm">
          {rows.map((r) => {
            const h = held[r.studentId];
            return (
              <li key={r.studentId} className="space-y-2 px-3 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong>{r.name}</strong>
                  <span className="text-muted-foreground">{statusOf(r)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {h ? (
                    <>
                      <Button
                        type="button"
                        size="touch"
                        variant="secondary"
                        onClick={() => void copy(h.url, `Lien de ${r.name}`)}
                      >
                        Copier le lien<span className="sr-only"> de {r.name}</span>
                      </Button>
                      <Button
                        type="button"
                        size="touch"
                        variant="outline"
                        onClick={() => void copy(h.message, `Message de ${r.name}`)}
                      >
                        Copier le message<span className="sr-only"> de {r.name}</span>
                      </Button>
                    </>
                  ) : null}
                  <Confirm
                    trigger={
                      <>
                        {r.hasLink ? "Nouveau lien" : "Créer le lien"}
                        <span className="sr-only"> pour {r.name}</span>
                      </>
                    }
                    title={`${r.hasLink ? "Nouveau lien" : "Créer le lien"} pour ${r.name} ?`}
                    description={
                      r.hasLink
                        ? `Le lien actuel de ${r.name} cessera de fonctionner. Le nouveau ne s’affichera qu’une fois ; les autres liens ne changent pas.`
                        : `Un lien est créé pour ${r.name} seulement. Il ne s’affichera qu’une fois.`
                    }
                    action={r.hasLink ? "Créer un nouveau lien" : "Créer le lien"}
                    disabled={pending}
                    onConfirm={() =>
                      start(async () => {
                        dropHeld(r.studentId);
                        apply(
                          await createStudentLinks(moduleId, false, r.studentId),
                          `Lien de ${r.name} créé : copie-le maintenant.`,
                        );
                      })
                    }
                  />
                  {r.hasLink ? (
                    <Confirm
                      trigger={
                        <>
                          Retirer l’accès<span className="sr-only"> de {r.name}</span>
                        </>
                      }
                      variant="ghost"
                      title={`Retirer l’accès de ${r.name} ?`}
                      description={`Le lien de ${r.name} cessera de fonctionner. Les autres liens restent valables.`}
                      action="Retirer l’accès"
                      disabled={pending}
                      onConfirm={() =>
                        start(async () => {
                          dropHeld(r.studentId);
                          apply(
                            await revokeStudentLink(moduleId, r.studentId),
                            `Accès de ${r.name} retiré.`,
                          );
                        })
                      }
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {heldList.length > 0 ? (
        !confirmSend ? (
          <Button
            type="button"
            size="touch"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setSending({});
              setConfirmSend(true);
            }}
          >
            Envoyer par e-mail
          </Button>
        ) : (
          <div
            role="alertdialog"
            aria-labelledby="send-title"
            className="bg-muted space-y-2 rounded-xl border p-3"
          >
            <p id="send-title" className="text-sm font-medium">
              Envoyer son lien à {namesOf(heldList.map((r) => r.name))} ? Chacun·e reçoit un e-mail
              à son adresse.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="touch"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setConfirmSend(false);
                    setSending(
                      await sendStudentLinksEmail(
                        moduleId,
                        heldList.map((r) => ({
                          studentId: r.studentId,
                          url: held[r.studentId].url,
                        })),
                      ),
                    );
                  })
                }
              >
                Confirmer l’envoi
              </Button>
              <Button
                type="button"
                size="touch"
                variant="ghost"
                onClick={() => setConfirmSend(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        )
      ) : null}
      {sending.error ? <ActionError error={sending.error} /> : null}
      {sending.results ? (
        <div role="status" className="space-y-1 text-sm">
          <p className="font-medium">
            {sending.results.filter((x) => x.status === "sent").length} e-mail(s) envoyé(s)
            {sending.results.some((x) => x.status !== "sent") ? ", certains ont échoué :" : "."}
          </p>
          <ul className="list-disc pl-5">
            {sending.results
              .filter((x) => x.status !== "sent")
              .map((x) => (
                <li key={x.studentId}>
                  {x.name} : {x.message ?? "échec"}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
      <p role="status" aria-live="polite" className="min-h-5 text-sm font-medium">
        {note}
      </p>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
