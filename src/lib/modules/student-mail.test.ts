import { describe, expect, it } from "vitest";

import { studentLinkEmail, tokenFromSpaceUrl } from "./student-mail";

describe("studentLinkEmail", () => {
  const mail = studentLinkEmail({
    firstName: "Camille",
    moduleName: "Méthodologies Agile & Scrum",
    url: "https://mg-cours.vercel.app/espace/abc",
    teacherName: "Marie Gautron",
  });

  it("vouvoie, donne le lien et signe de l'enseignante", () => {
    expect(mail.subject).toContain("Méthodologies Agile & Scrum");
    expect(mail.text).toContain("Bonjour Camille,");
    expect(mail.text).toContain("Votre espace personnel");
    expect(mail.text).toContain("https://mg-cours.vercel.app/espace/abc");
    expect(mail.text.trimEnd().endsWith("Marie Gautron")).toBe(true);
    expect(mail.text).not.toMatch(/\btu\b|\bton\b|\bta\b/i);
  });

  it("ne mentionne aucun outil d'IA", () => {
    expect(mail.text + mail.subject).not.toMatch(
      /claude|anthropic|\bIA\b|intelligence artificielle/i,
    );
  });
});

describe("tokenFromSpaceUrl", () => {
  it("lit le jeton, refuse le reste", () => {
    const token = "A".repeat(43);
    expect(tokenFromSpaceUrl(`https://x.test/espace/${token}`)).toBe(token);
    expect(tokenFromSpaceUrl(`https://x.test/espace/${token}/`)).toBe(token);
    expect(tokenFromSpaceUrl("https://x.test/espace/court")).toBeNull();
    expect(tokenFromSpaceUrl("https://x.test/module/" + token)).toBeNull();
  });
});
