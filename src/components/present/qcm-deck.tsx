import { Check, X } from "lucide-react";

import { Markdown } from "@/components/markdown";
import { coverSlide } from "@/components/present/deck";
import type { PresentSlide } from "@/components/present/present-shell";
import {
  choiceLetter,
  choiceVerdict,
  groupSummary,
  numericAnswerLabel,
  questionCounter,
  questionTypeLabel,
  type QcmGroup,
  type QcmQuestion,
} from "@/lib/present/qcm";

/**
 * Diapositives du mini-QCM d'une fiche : un intercalaire, puis pour chaque question une diapo
 * d'énoncé (sans la bonne réponse) suivie de sa correction. Réservées au mode diapositives.
 */
export function qcmSlides(section: number, group: QcmGroup): PresentSlide[] {
  const total = group.shown.length;
  const slides: PresentSlide[] = [
    {
      ...coverSlide(section, {
        eyebrow: "Mini-QCM",
        title: group.title,
        subtitle: groupSummary({ available: total, shown: group.shown }),
      }),
      slidesOnly: true,
    },
  ];
  group.shown.forEach((question, i) => {
    const counter = questionCounter(i, total);
    slides.push(
      {
        section,
        label: `${counter} · ${group.title}`,
        slidesOnly: true,
        node: <QuestionView title={group.title} counter={counter} question={question} />,
      },
      {
        section,
        label: `Correction, ${counter.toLowerCase()} · ${group.title}`,
        slidesOnly: true,
        node: <CorrectionView title={group.title} counter={counter} question={question} />,
      },
    );
  });
  return slides;
}

function Header({
  eyebrow,
  counter,
  question,
}: {
  eyebrow: string;
  counter: string;
  question: QcmQuestion;
}) {
  return (
    <div className="space-y-1">
      <p className="text-primary text-2xl font-bold tracking-widest uppercase">{eyebrow}</p>
      <h2 className="font-heading text-4xl font-semibold">{counter}</h2>
      <p className="text-muted-foreground text-2xl">{questionTypeLabel(question)}</p>
    </div>
  );
}

function QuestionView({
  title,
  counter,
  question,
}: {
  title: string;
  counter: string;
  question: QcmQuestion;
}) {
  return (
    <div className="space-y-8">
      <Header eyebrow={`Mini-QCM · ${title}`} counter={counter} question={question} />
      <Markdown source={question.statement} headingLevel={3} size="present" />
      {question.type === "numerical" ? (
        <p className="text-muted-foreground text-3xl">Note ta réponse : un nombre.</p>
      ) : (
        <ol className="space-y-3" aria-label="Réponses possibles">
          {question.choices.map((choice, i) => (
            <li
              key={choice.id}
              className="bg-card flex items-baseline gap-5 rounded-3xl border-2 px-6 py-4"
            >
              <span
                aria-label={`Réponse ${choiceLetter(i)}`}
                className="font-heading text-primary text-4xl font-bold"
              >
                {choiceLetter(i)}
              </span>
              <span className="text-3xl leading-snug">{choice.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CorrectionView({
  title,
  counter,
  question,
}: {
  title: string;
  counter: string;
  question: QcmQuestion;
}) {
  const numeric = question.type === "numerical";
  return (
    <div className="space-y-6">
      <Header eyebrow={`Correction · ${title}`} counter={counter} question={question} />
      <div className="text-muted-foreground max-h-40 overflow-hidden text-xl">
        <Markdown source={question.statement} headingLevel={3} />
      </div>
      {numeric ? (
        <p className="border-primary bg-primary/15 rounded-3xl border-2 px-6 py-4 text-3xl">
          <Check aria-hidden className="mr-3 inline size-8 align-text-bottom" />
          <span className="font-semibold">Bonne réponse : </span>
          {numericAnswerLabel(question.numericValue ?? 0, question.numericTolerance)}
        </p>
      ) : (
        <ol className="space-y-3" aria-label="Correction des réponses">
          {question.choices.map((choice, i) => {
            const correct = choiceVerdict(choice) === "correct";
            return (
              <li
                key={choice.id}
                className={`rounded-3xl border-2 px-6 py-3 ${correct ? "border-primary bg-primary/15" : "bg-card"}`}
              >
                <div className="flex items-baseline gap-5">
                  <span className="font-heading text-primary text-3xl font-bold">
                    {choiceLetter(i)}
                  </span>
                  <span className="flex-1 text-2xl leading-snug">{choice.text}</span>
                  <span className="inline-flex shrink-0 items-center gap-2 text-xl font-semibold">
                    {correct ? (
                      <Check aria-hidden className="size-6" />
                    ) : (
                      <X aria-hidden className="text-muted-foreground size-6" />
                    )}
                    {correct ? "Bonne réponse" : "À écarter"}
                  </span>
                </div>
                {choice.feedback.trim() ? (
                  <p className="text-muted-foreground mt-1 pl-14 text-xl leading-snug">
                    {choice.feedback}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {question.generalFeedback.trim() ? (
        <div className="bg-muted/50 rounded-3xl border-l-8 p-5 text-xl">
          <p className="text-primary mb-1 text-lg font-bold tracking-widest uppercase">À retenir</p>
          <Markdown source={question.generalFeedback} headingLevel={3} />
        </div>
      ) : null}
    </div>
  );
}
