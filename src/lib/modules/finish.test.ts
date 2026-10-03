import { describe, expect, it } from "vitest";

import { finishChecklist } from "./finish";

const base = {
  courses: [{ completion: "done" }, { completion: "done" }],
  notes: { entered: 3, required: 3 },
  adminDocs: { notes_hyperplanning: true, supports_moodle: true, sujets_grilles_moodle: true },
  invoiceSent: true,
  invoicePaid: true,
  agreementDeposited: true,
};

describe("finishChecklist", () => {
  it("tout est fait", () => {
    expect(finishChecklist(base).every((i) => i.done)).toBe(true);
  });
  it("dit ce qu'il reste, sans rien bloquer", () => {
    const items = finishChecklist({
      ...base,
      courses: [{ completion: "done" }, { completion: null }],
      adminDocs: { supports_moodle: true },
      invoicePaid: false,
    });
    const by = Object.fromEntries(items.map((i) => [i.key, i]));
    expect(by.sessions).toMatchObject({ done: false, detail: "1 séance sur 2" });
    expect(by.notes.done).toBe(false);
    expect(by.invoice.detail).toBe("Case « payée » à cocher");
    expect(by.documents.done).toBe(false);
  });
  it("la convention manquante se voit, sans bloquer", () => {
    const items = finishChecklist({ ...base, agreementDeposited: false });
    expect(items.find((i) => i.key === "agreement")).toMatchObject({
      label: "Convention déposée",
      done: false,
    });
  });
});
