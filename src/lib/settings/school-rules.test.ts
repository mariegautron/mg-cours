import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCHOOL_RULES,
  emailFromTemplate,
  parseAppreciationMax,
  readSchoolRules,
  slugName,
  validateEmailTemplate,
} from "./school-rules";

describe("readSchoolRules", () => {
  it("sans ligne : valeurs par défaut (garde la note du groupe, 250 caractères, pas de modèle)", () => {
    expect(readSchoolRules(null)).toEqual(DEFAULT_SCHOOL_RULES);
    expect(DEFAULT_SCHOOL_RULES).toEqual({
      absenceRule: "keep_group_grade",
      emailTemplate: "",
      appreciationMax: 250,
    });
  });
  it("lit une ligne complète", () => {
    expect(
      readSchoolRules({
        absence_rule: "makeup",
        email_template: " {prenom}.{nom}@ynov.com ",
        appreciation_max: 300,
      }),
    ).toEqual({
      absenceRule: "makeup",
      emailTemplate: "{prenom}.{nom}@ynov.com",
      appreciationMax: 300,
    });
  });
  it("une valeur invalide retombe sur le défaut", () => {
    const r = readSchoolRules({ absence_rule: "n'importe quoi", appreciation_max: 5 });
    expect(r.absenceRule).toBe("keep_group_grade");
    expect(r.appreciationMax).toBe(250);
    expect(readSchoolRules({ appreciation_max: 99999 }).appreciationMax).toBe(250);
    expect(readSchoolRules({ appreciation_max: 120.5 }).appreciationMax).toBe(250);
  });
});

describe("validateEmailTemplate", () => {
  it("accepte les modèles courants et le vide", () => {
    for (const t of ["{prenom}.{nom}@ynov.com", "{nom}-{prenom}@ecole.fr", "{prenom}@a.b.fr", ""]) {
      expect(validateEmailTemplate(t)).toEqual({ ok: true });
    }
  });
  it("refuse : variable inconnue, pas d'arobase, deux arobases, espace, sans variable, domaine invalide", () => {
    const err = (t: string) => {
      const r = validateEmailTemplate(t);
      return r.ok ? null : r.error;
    };
    expect(err("{prenom}.{surnom}@ynov.com")).toContain("{surnom}");
    expect(err("{prenom}.{nom}")).toContain("arobase");
    expect(err("{prenom}@{nom}@ynov.com")).toContain("arobase");
    expect(err("{prenom} {nom}@ynov.com")).toContain("espace");
    expect(err("contact@ynov.com")).toContain("{prenom} ou {nom}");
    expect(err("{prenom}@ynov")).toContain("domaine");
    expect(err("{prenom}.{nom@ynov.com")).not.toBeNull();
    expect(err("{prenom}@{nom}.fr")).toContain("domaine");
  });
});

describe("slugName / emailFromTemplate", () => {
  it("accents, casse, tirets, espaces, apostrophes", () => {
    expect(slugName("Éloïse")).toBe("eloise");
    expect(slugName("Jean-Pierre")).toBe("jean-pierre");
    expect(slugName("De La Fontaine")).toBe("de-la-fontaine");
    expect(slugName("d’Artagnan")).toBe("dartagnan");
    expect(slugName("  Œuvre  ")).toBe("oeuvre");
    expect(slugName("Zoë--Lou")).toBe("zoe-lou");
  });
  it("génère l'adresse depuis le modèle", () => {
    expect(emailFromTemplate("{prenom}.{nom}@ynov.com", "Éloïse", "Dupont-Martin")).toBe(
      "eloise.dupont-martin@ynov.com",
    );
    expect(emailFromTemplate("{nom}@ecole.fr", "Zoé", "De La Roche")).toBe("de-la-roche@ecole.fr");
  });
  it("rien sans modèle valide ou sans nom exploitable", () => {
    expect(emailFromTemplate("", "A", "B")).toBeNull();
    expect(emailFromTemplate("{prenom}@x", "A", "B")).toBeNull();
    expect(emailFromTemplate("{prenom}.{nom}@ynov.com", "", "Dupont")).toBeNull();
    expect(emailFromTemplate("{nom}@ynov.com", "", "Dupont")).toBe("dupont@ynov.com");
    expect(emailFromTemplate("{prenom}.{nom}@ynov.com", "!!!", "Dupont")).toBeNull();
  });
});

describe("parseAppreciationMax", () => {
  it("entier entre 50 et 2000", () => {
    expect(parseAppreciationMax("250")).toEqual({ ok: true, value: 250 });
    expect(parseAppreciationMax(" 50 ")).toEqual({ ok: true, value: 50 });
    expect(parseAppreciationMax("49").ok).toBe(false);
    expect(parseAppreciationMax("2001").ok).toBe(false);
    expect(parseAppreciationMax("12,5").ok).toBe(false);
    expect(parseAppreciationMax("").ok).toBe(false);
  });
});
