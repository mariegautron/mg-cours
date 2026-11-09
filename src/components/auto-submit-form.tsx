"use client";

/** Formulaire de filtres (GET) envoyé dès qu'un menu déroulant change : « Filtrer » devient facultatif. */
export function AutoSubmitForm(props: React.ComponentProps<"form">) {
  return (
    <form
      {...props}
      onChange={(e) => {
        if (e.target instanceof HTMLSelectElement) e.currentTarget.requestSubmit();
      }}
    />
  );
}
