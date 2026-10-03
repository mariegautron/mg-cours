import type { Metadata } from "next";

import { callResult } from "@/lib/result-links/public";
import type { PublicSheet } from "@/lib/result-links/sheet";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mon résultat",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children ? <p className="text-muted-foreground">{children}</p> : null}
    </section>
  );
}

function Result({ sheet, token }: { sheet: PublicSheet; token: string }) {
  const me = sheet.recipients[0];
  const absentExcusedNoNote = sheet.attendance === "absent_excused" && sheet.value === null;
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-muted-foreground text-sm">
          {[sheet.moduleName, sheet.date ? new Date(sheet.date).toLocaleDateString("fr-FR") : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <h1 className="text-2xl font-semibold">{sheet.title}</h1>
        <p>
          {sheet.isGroupGrade ? "Note de groupe pour " : "Résultat de "}
          <strong>{me.name}</strong>
        </p>
        {sheet.theme ? (
          <p className="text-muted-foreground text-sm">Thème du projet : {sheet.theme}</p>
        ) : null}
      </header>

      {absentExcusedNoNote ? (
        <p className="rounded-lg border p-4">
          Ton absence est excusée : tu n’as pas de note pour cette évaluation. Ta note sera celle du
          rattrapage.
        </p>
      ) : (
        <section aria-labelledby="note" className="rounded-lg border p-4">
          <h2 id="note" className="text-muted-foreground text-sm font-medium">
            Ta note
          </h2>
          <p className="text-4xl font-semibold">
            {sheet.value === null ? "—" : fmt(sheet.value)}{" "}
            <span className="text-muted-foreground text-xl font-normal">
              / {fmt(sheet.maxScore)}
            </span>
          </p>
          {sheet.maxScore !== 20 && sheet.valueOn20 !== null ? (
            <p className="text-muted-foreground text-sm">Soit {fmt(sheet.valueOn20)} / 20.</p>
          ) : null}
          {sheet.overflow ? <p className="text-sm">Total avec bonus : {sheet.overflow}</p> : null}
        </section>
      )}

      {sheet.attendance === "absent_unexcused" ? (
        <p className="rounded-lg border p-4">
          Absence non prévenue : la note est de 0 (règle de l’école).
        </p>
      ) : null}
      {sheet.attendance === "absent_excused" && sheet.value !== null ? (
        <p className="rounded-lg border p-4">
          Ton absence est excusée : tu gardes la note du groupe (règle de l’école).
        </p>
      ) : null}
      {sheet.personalNote ? (
        <section aria-labelledby="mot" className="rounded-lg border p-4">
          <h2 id="mot" className="font-medium">
            Un mot pour toi
          </h2>
          <p className="whitespace-pre-wrap">{sheet.personalNote}</p>
        </section>
      ) : null}

      {sheet.attendance === "present" && sheet.criteria.length > 0 ? (
        <section aria-labelledby="detail" className="space-y-3">
          <h2 id="detail" className="text-lg font-medium">
            Détail par critère
          </h2>
          {sheet.axes.some((a) => a.comment) ? (
            <ul className="space-y-2">
              {sheet.axes
                .filter((a) => a.comment)
                .map((a) => (
                  <li key={a.label ?? "autres"} className="rounded-md border p-3 text-sm">
                    <strong>{a.label ?? "Autres critères"}</strong> : {a.comment}
                  </li>
                ))}
            </ul>
          ) : null}
          <ul className="divide-y rounded-lg border">
            {sheet.criteria.map((c, i) => (
              <li key={c.label + i} className="space-y-1 p-3">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {c.axis ? `${c.axis} · ` : ""}
                    {c.label}
                  </span>
                  <span>
                    {c.points === null ? "Pas noté" : `${fmt(c.points)} / ${fmt(c.max)}`}
                    {c.isBonus ? " (bonus)" : ""}
                  </span>
                </p>
                {c.level?.description ? (
                  <p className="text-muted-foreground text-sm">
                    Palier obtenu : {c.level.description}
                  </p>
                ) : null}
                {c.comment ? <p className="text-sm whitespace-pre-wrap">{c.comment}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {[
        ["Tes points forts", sheet.strengths],
        ["Tes progrès", sheet.progress],
        ["Commentaire", sheet.feedback],
      ].map(([heading, text]) =>
        text?.trim() ? (
          <section key={heading} className="space-y-1">
            <h2 className="font-medium">{heading}</h2>
            <p className="whitespace-pre-wrap">{text}</p>
          </section>
        ) : null,
      )}
      {sheet.comments.length > 0 ? (
        <section className="space-y-1">
          <h2 className="font-medium">Commentaires</h2>
          <ul className="list-disc space-y-1 pl-5">
            {sheet.comments.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p>
        <a
          href={`/resultats/${token}/pdf`}
          className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md px-4 font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Télécharger mon PDF
        </a>
      </p>
    </div>
  );
}

/** Résultats d'UNE personne par lien personnel (US-147) : aucune connexion, aucune navigation vers l'appli. */
export default async function PublicResultPage({ params }: PageProps<"/resultats/[token]">) {
  const { token } = await params;
  const result = await callResult(token);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-6">
      {result.status === "ok" ? (
        <Result sheet={result.sheet} token={token} />
      ) : result.status === "throttled" ? (
        <Message title="Trop d’essais">
          Trop de liens invalides ont été essayés depuis ta connexion. Réessaie dans quelques
          minutes.
        </Message>
      ) : result.status === "unavailable" ? (
        <Message title="Page momentanément indisponible">Réessaie dans un instant.</Message>
      ) : (
        <Message title="Lien invalide ou expiré">
          Vérifie que tu as copié le lien en entier. S’il ne marche toujours pas, demande-en un
          nouveau à ton enseignante.
        </Message>
      )}
    </main>
  );
}
