import { describe, expect, it } from "vitest";

import { formatWhen, pickResume, type ResumeCandidate } from "./resume";

const now = new Date("2026-11-04T12:00:00Z");
const c = (kind: ResumeCandidate["kind"], title: string, updatedAt: string): ResumeCandidate => ({
  kind,
  title,
  href: "/x",
  updatedAt,
});

describe("pickResume", () => {
  it("garde le travail le plus récent, tous types confondus", () => {
    const r = pickResume(
      [
        c("resource_draft", "Atelier", "2026-11-03T16:40:00Z"),
        c("session_prep", "Séance 5", "2026-11-04T08:00:00Z"),
        c("resource_draft", "Vieux", "2026-10-20T08:00:00Z"),
      ],
      now,
    );
    expect(r?.title).toBe("Séance 5");
  });
  it("rien si la liste est vide ou trop ancienne", () => {
    expect(pickResume([], now)).toBeNull();
    expect(pickResume([c("resource_draft", "Ancien", "2026-08-01T08:00:00Z")], now)).toBeNull();
  });
  it("ignore une date invalide ou dans le futur", () => {
    expect(
      pickResume(
        [
          c("resource_draft", "?", "pas une date"),
          c("session_prep", "Futur", "2027-01-01T00:00:00Z"),
        ],
        now,
      ),
    ).toBeNull();
  });
  it("égalité : la séance avant la ressource, puis le titre", () => {
    const t = "2026-11-04T08:00:00Z";
    expect(pickResume([c("resource_draft", "A", t), c("session_prep", "B", t)], now)?.kind).toBe(
      "session_prep",
    );
    expect(pickResume([c("resource_draft", "B", t), c("resource_draft", "A", t)], now)?.title).toBe(
      "A",
    );
  });
});

describe("formatWhen", () => {
  it("aujourd'hui, hier, ou la date", () => {
    expect(formatWhen("2026-11-04T09:15:00Z", now)).toBe("aujourd’hui à 10:15");
    expect(formatWhen("2026-11-03T16:40:00Z", now)).toBe("hier à 17:40");
    expect(formatWhen("2026-10-12T10:00:00Z", now)).toBe("le 12/10");
  });
});
