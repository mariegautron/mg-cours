/**
 * Analyse rédigée des 7 réponses reçues (lues le 05/11/2026) pour le module « Méthodologies Agile &
 * Scrum » UNIQUEMENT. Texte figé, volontairement hors du moteur de synthèse : il ne se met pas à jour
 * si d'autres réponses arrivent. Les citations sont reprises mot pour mot, anonymes.
 */
export const AGILE_FEEDBACK_MODULE_ID = "fd123544-d4d7-45d7-8ae4-343310cf5ef8";

interface Theme {
  title: string;
  mentions: string;
  text: string;
  quotes: string[];
}

const STRENGTHS: Theme[] = [
  {
    title: "La pratique : TP, jeux de rôles, exercices de groupe",
    mentions: "5 personnes sur 7",
    text: "C’est ce qui fait progresser et ce qu’on te demande de garder. Les étudiant·es citent des moments concrets (le sprint du projet, les jeux de rôles), pas des impressions.",
    quotes: [
      "Le sprint du projet et l’échange entre membres du groupe.",
      "Les jeux de rôles",
      "les tp sont tres angageant",
    ],
  },
  {
    title: "Le projet de groupe sur tout le module",
    mentions: "2 personnes",
    text: "Le fil rouge est apprécié, y compris dans la question « à ne pas changer ».",
    quotes: ["Garder le projet de groupe sur tous le module."],
  },
  {
    title: "Ton énergie et ta bonne humeur",
    mentions: "2 personnes",
    text: "Cité spontanément dans « ce que je ne dois pas changer ».",
    quotes: ["L’énergie, tu es très engageante", "Votre bonhumeur"],
  },
];

const IMPROVEMENTS: Theme[] = [
  {
    title: "La théorie qui décroche : flux et métriques",
    mentions: "3 personnes",
    text: "Les seuls moments de décrochage cités sont théoriques, et deux d’entre eux concernent les flux et les métriques. Piste : relier chaque notion de flux à un exercice ou à un chiffre du projet de groupe, plutôt qu’un exposé suivi.",
    quotes: [
      "Le cours sur les flux.",
      "sur la partie théorique des metrique agiles j’ai un peu décrocher",
      "pendant certaines théorie",
    ],
  },
  {
    title: "Le vocabulaire au démarrage",
    mentions: "1 personne, mais très précis",
    text: "Epic, Feature, US et Task arrivent trop vite pour qui découvre Scrum. Piste : une diapo « du plus gros au plus petit » dès la première séance, gardée en référence tout le module.",
    quotes: ["J’ai été un peu perdu sur les différents termes au début : Epic, Feature, Task, US"],
  },
  {
    title: "Des niveaux de départ très différents",
    mentions: "2 personnes, dans des sens opposés",
    text: "Une personne pratique déjà l’agile en entreprise, une autre ne connaissait rien. Piste : sonder le niveau en début de module (une question à main levée suffit) pour savoir à qui tu parles.",
    quotes: [
      "Un peu moins partir du principe que tout le monde connait agile",
      "Je ne connaissait rien sur Scrum donc a peu près tous : Sprint Planning, Sprint, Sprint Review, Retro",
    ],
  },
  {
    title: "Les diapositives et le temps de l’évaluation individuelle",
    mentions: "1 personne chacun",
    text: "À vérifier de ton côté : l’enchaînement des diapos n’est pas toujours lisible, et le temps de l’évaluation individuelle paraît court à une personne.",
    quotes: [
      "les diapositives, je comprenait mal l’enchainement",
      "Mettre un peu plus de temps pour l’évaluation individuelle.",
    ],
  },
];

const LEARNED = [
  "Les cérémonies de Scrum : planning, sprint, review, rétrospective (3 personnes).",
  "Estimer et organiser la charge, et la différence entre Scrum et Kanban.",
  "Appliquer la méthode, avec un bénéfice net pour qui la pratiquait « à sa sauce » : « la WIP limit j’en parlerais au scrum master ».",
];

const FRIEND = [
  "Scrum permet de construire un produit par petits sprints, en priorisant toujours ce qui apporte le plus de valeur au client.",
  "Ce module permet d’apprendre comment travailler en équipe de manière agile ; adaptable et transparente.",
];

function ThemeCard({ t }: { t: Theme }) {
  return (
    <li className="space-y-2 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-semibold">{t.title}</h4>
        <span className="text-muted-foreground text-xs">{t.mentions}</span>
      </div>
      <p className="text-sm">{t.text}</p>
      <ul className="space-y-1.5">
        {t.quotes.map((q) => (
          <li key={q}>
            <blockquote className="border-primary/50 border-l-4 pl-3 text-sm italic">
              {q}
            </blockquote>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Analyse du retour des étudiant·es pour le module Agile & Scrum (7 réponses, lues le 05/11/2026). */
export function FeedbackAnalysisAgile() {
  return (
    <section aria-labelledby="fa" className="bg-card space-y-5 rounded-xl border p-5">
      <header className="space-y-1">
        <h2 id="fa" className="text-sm font-semibold">
          Analyse des réponses
        </h2>
        <p className="text-muted-foreground text-sm">
          Lecture rédigée de 7 réponses (un double envoi a été écarté), faite le 5 novembre 2026.
          Elle ne se met pas à jour si d’autres réponses arrivent.
        </p>
      </header>

      <div className="border-primary/40 bg-primary/5 space-y-2 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">En une phrase</h3>
        <p className="text-sm">
          Un module très bien reçu (4,6 sur 5 d’appréciation, 7 réponses sur 7 qui le recommandent),
          porté par la pratique et l’énergie de l’animation. Le point à travailler est la théorie :
          flux et métriques, et un vocabulaire posé trop vite pour les débutant·es.
        </p>
      </div>

      <div className="grid gap-3 text-center sm:grid-cols-3">
        {[
          ["4,6 / 5", "Ce module m’a plu"],
          ["4,7 / 5", "J’ai appris des choses réutilisables"],
          ["7 / 7", "recommandent (3 « oui », 4 « plutôt oui »)"],
        ].map(([n, l]) => (
          <div key={l} className="rounded-lg border p-3">
            <div className="font-heading text-2xl font-bold">{n}</div>
            <div className="text-muted-foreground text-xs">{l}</div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Aucune note en dessous de 4, et 7 sur 7 trouvent l’équilibre théorie / pratique bon : pas de
        changement de rythme à faire de ce côté.
      </p>

      <div>
        <h3 className="text-sm font-semibold">Ce qui marche</h3>
        <ul className="divide-y">
          {STRENGTHS.map((t) => (
            <ThemeCard key={t.title} t={t} />
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-semibold">À améliorer, par ordre d’importance</h3>
        <ul className="divide-y">
          {IMPROVEMENTS.map((t) => (
            <ThemeCard key={t.title} t={t} />
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ce qu’ils retiennent</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {LEARNED.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="text-sm font-medium">Le module en deux phrases, selon eux :</p>
        {FRIEND.map((q) => (
          <blockquote key={q} className="border-primary/50 border-l-4 pl-3 text-sm italic">
            {q}
          </blockquote>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">
        À lire avec prudence : 7 réponses seulement, et les notes sont très hautes. Le questionnaire
        est anonyme, mais les plus mécontents répondent moins volontiers à ce genre d’enquête.
      </p>
    </section>
  );
}
