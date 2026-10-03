import { Mascot } from "@/components/mascot";
import { STAGE_TEXT, type ModuleStage } from "@/lib/modules/completion";

/**
 * États de fin de la page module (US-131) : « Tout est prêt » (action « Terminer et ranger ») et
 * « Module terminé » (résumé et mot privé). Sobre : Plume est décorative, le texte dit tout.
 */
export function ModuleCompletion({
  stage,
  lines,
  note,
  children,
}: {
  stage: Exclude<ModuleStage, "in_progress">;
  lines: string[];
  note?: string | null;
  children?: React.ReactNode;
}) {
  const text = STAGE_TEXT[stage];
  return (
    <section
      aria-labelledby="completion"
      className="bg-card flex flex-wrap items-center gap-6 rounded-xl border p-5"
    >
      <Mascot mood={stage === "all_ready" ? "party" : "happy"} className="size-24" />
      <div className="min-w-0 flex-1 space-y-2">
        <h2 id="completion" className="font-heading text-xl font-semibold">
          {text.title}
        </h2>
        <p className="text-muted-foreground text-sm">{text.body}</p>
        {lines.length ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : null}
        {note ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Ce que je retiens : </span>
            <span className="whitespace-pre-wrap">{note}</span>
          </p>
        ) : null}
        {children ? <div className="pt-1">{children}</div> : null}
      </div>
    </section>
  );
}
