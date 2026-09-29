import { describe, expect, it } from "vitest";

import { actionLink, EMAIL_NOT_ENABLED, failure, NOT_FOUND, SESSION_EXPIRED } from "@/lib/messages";

describe("failure", () => {
  it("dit ce qui n'a pas marché et l'issue, sans promettre de conserver la saisie", () => {
    expect(failure("enregistrer")).toBe("On n’a pas pu enregistrer. Réessaie dans un instant.");
  });

  it("promet la saisie conservée seulement sur demande", () => {
    expect(failure("enregistrer", { kept: true })).toBe(
      "On n’a pas pu enregistrer. Ta saisie est conservée. Réessaie dans un instant.",
    );
  });
});

describe("ton", () => {
  it("tutoie : jamais de vouvoiement dans les messages partagés", () => {
    const all = [
      failure("x", { kept: true }),
      SESSION_EXPIRED,
      EMAIL_NOT_ENABLED,
      ...Object.values(NOT_FOUND),
    ];
    for (const message of all)
      expect(message).not.toMatch(/\b(vous|votre|vos|réessayez|renseignez)\b/i);
  });

  it("n'expose aucun nom de variable d'environnement", () => {
    expect(EMAIL_NOT_ENABLED).not.toMatch(/RESEND|_KEY|_FROM/);
  });
});

describe("actionLink", () => {
  it("propose de se reconnecter dans un nouvel onglet quand la session a expiré", () => {
    expect(actionLink(SESSION_EXPIRED)).toEqual({
      href: "/login",
      label: "Te reconnecter (nouvel onglet)",
      newTab: true,
    });
  });

  it("renvoie vers la liste quand l'élément n'existe plus", () => {
    expect(actionLink(NOT_FOUND.module)?.href).toBe("/modules");
    expect(actionLink(NOT_FOUND.invoice)?.href).toBe("/billing");
  });

  it("n'ajoute pas de lien à un message ordinaire", () => {
    expect(actionLink(failure("enregistrer"))).toBeNull();
  });
});
