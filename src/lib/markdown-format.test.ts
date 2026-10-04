import { describe, expect, it } from "vitest";

import { applyFormat } from "./markdown-format";

describe("mise en forme Markdown", () => {
  it("met la sélection en gras, puis retire le gras", () => {
    const bold = applyFormat("Un client simple", 3, 9, "bold");
    expect(bold.value).toBe("Un **client** simple");
    expect(bold.value.slice(bold.start, bold.end)).toBe("client");
    expect(applyFormat(bold.value, bold.start, bold.end, "bold").value).toBe("Un client simple");
  });

  it("propose un texte d'exemple sans sélection", () => {
    const r = applyFormat("", 0, 0, "italic");
    expect(r.value).toBe("*texte en italique*");
    expect(r.value.slice(r.start, r.end)).toBe("texte en italique");
  });

  it("préfixe chaque ligne touchée pour une liste, une citation ou un titre", () => {
    expect(applyFormat("a\nb\nc", 0, 3, "list").value).toBe("- a\n- b\nc");
    expect(applyFormat("Un besoin", 0, 0, "quote").value).toBe("> Un besoin");
    expect(applyFormat("Titre", 2, 2, "heading").value).toBe("### Titre");
  });

  it("retire le préfixe quand toutes les lignes l'ont déjà", () => {
    expect(applyFormat("- a\n- b", 0, 7, "list").value).toBe("a\nb");
  });

  it("insère un lien en sélectionnant l'adresse", () => {
    const r = applyFormat("voir le site", 8, 12, "link");
    expect(r.value).toBe("voir le [site](https://)");
    expect(r.value.slice(r.start, r.end)).toBe("https://");
  });
});
