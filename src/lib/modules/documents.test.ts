import { describe, expect, it } from "vitest";

import { agreementDeposited, agreementTitle, sortAgreements } from "./documents";

const doc = (id: string, signed_on: string | null, created_at: string) => ({
  id,
  name: `${id}.pdf`,
  label: null,
  signed_on,
  created_at,
});

describe("sortAgreements", () => {
  it("trie par date de signature, puis les sans-date par dépôt", () => {
    const out = sortAgreements([
      doc("c", null, "2026-01-02"),
      doc("b", "2025-07-15", "2026-01-01"),
      doc("a", "2025-05-19", "2026-01-03"),
      doc("d", null, "2026-01-01"),
    ]);
    expect(out.map((d) => d.id)).toEqual(["a", "b", "d", "c"]);
  });
});

describe("agreementTitle / agreementDeposited", () => {
  it("libellé libre sinon nom du fichier", () => {
    expect(agreementTitle({ label: " Avenant 1 ", name: "x.pdf" })).toBe("Avenant 1");
    expect(agreementTitle({ label: null, name: "x.pdf" })).toBe("x.pdf");
  });
  it("coché dès qu'un fichier existe", () => {
    expect(agreementDeposited([{ kind: "slides" }])).toBe(false);
    expect(agreementDeposited([{ kind: "training_agreement" }])).toBe(true);
  });
});
