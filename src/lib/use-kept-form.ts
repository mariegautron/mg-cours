import { startTransition, type FormEvent } from "react";

/**
 * Envoie un formulaire à une action (`useActionState`) **sans que React ne vide les champs** :
 * avec `<form action={…}>`, React 19 remet les champs non contrôlés à leur valeur initiale dès que
 * l'action se termine, y compris sur une erreur. Ici la saisie reste affichée, donc « Ta saisie est
 * conservée » est vrai. À brancher sur `onSubmit` à la place de `action` ; le bouton d'envoi
 * (`name` / `value` compris) est transmis comme d'habitude.
 */
export function keepFormValues(formAction: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(
      event.currentTarget,
      submitter instanceof HTMLElement ? submitter : null,
    );
    startTransition(() => formAction(data));
  };
}
