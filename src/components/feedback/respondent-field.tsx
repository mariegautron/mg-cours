"use client";

import { useEffect, useState } from "react";

const KEY = "mg-retour-repondant";

/**
 * Jeton aléatoire gardé par ce navigateur (rien qui identifie la personne) : un 2e envoi remplace
 * le premier. Affiche « Tu as déjà répondu » si ce navigateur a déjà envoyé ses réponses.
 */
export function RespondentField({ linkKey }: { linkKey: string }) {
  const [value, setValue] = useState("");
  const [already, setAlready] = useState(false);
  useEffect(() => {
    try {
      let id = localStorage.getItem(KEY);
      if (!id) {
        id = crypto.randomUUID().replace(/-/g, "");
        localStorage.setItem(KEY, id);
      }
      /* eslint-disable react-hooks/set-state-in-effect -- lu après hydratation */
      setValue(id);
      setAlready(localStorage.getItem(`${KEY}-${linkKey}`) === "1");
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      /* stockage indisponible : chaque envoi compte */
    }
  }, [linkKey]);
  return (
    <>
      <input type="hidden" name="respondent" value={value} />
      {already ? (
        <p role="status" className="rounded-md border p-3 text-sm">
          Tu as déjà répondu : si tu renvoies, tes réponses seront mises à jour (elles ne comptent
          qu’une fois).
        </p>
      ) : null}
    </>
  );
}

/** Après l'envoi : ce navigateur a répondu à ce questionnaire. */
export function MarkAnswered({ linkKey }: { linkKey: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(`${KEY}-${linkKey}`, "1");
    } catch {
      /* sans effet */
    }
  }, [linkKey]);
  return null;
}
