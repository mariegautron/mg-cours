import { describe, expect, it } from "vitest";

import { seenPairs } from "./draw-groups";
import {
  balancedSizes,
  boardSummary,
  countForSize,
  describeSizes,
  newGroup,
  placeStudent,
  redraw,
  removeStudent,
  renameGroup,
  sizeForCount,
  swapStudents,
  toggleGroupLock,
  toggleMemberLock,
  unplaced,
  type BoardGroup,
} from "./board";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `s${String(i).padStart(2, "0")}`);
const empty = (n: number): BoardGroup[] =>
  Array.from({ length: n }, (_, i) => newGroup(`g${i + 1}`, `Groupe ${i + 1}`));

describe("tailles", () => {
  it("15 personnes en 6 groupes : 3 de 3 et 3 de 2", () => {
    expect(balancedSizes(15, 6)).toEqual([3, 3, 3, 2, 2, 2]);
    expect(describeSizes(balancedSizes(15, 6))).toBe("3 groupes de 3, 3 de 2");
    expect(describeSizes([4])).toBe("1 groupe de 4");
    expect(balancedSizes(3, 6)).toEqual([1, 1, 1]);
    expect(balancedSizes(0, 4)).toEqual([]);
  });
  it("nombre de groupes ↔ taille visée", () => {
    expect(countForSize(15, 3)).toBe(5);
    expect(sizeForCount(15, 6)).toBe(3);
    expect(countForSize(0, 3)).toBe(0);
  });
});

describe("redraw", () => {
  it("place tout le monde une fois, reproductible, tailles équilibrées", () => {
    const input = { groups: empty(6), studentIds: ids(15), seed: "x" };
    const a = redraw(input);
    const b = redraw({ ...input, studentIds: [...ids(15)].reverse() });
    expect(a.groups.map((g) => g.members)).toEqual(b.groups.map((g) => g.members));
    expect(a.groups.flatMap((g) => g.members).sort()).toEqual(ids(15));
    expect(a.groups.map((g) => g.members.length).sort()).toEqual([2, 2, 2, 3, 3, 3]);
    expect(redraw({ ...input, seed: "y" }).groups.map((g) => g.members)).not.toEqual(
      a.groups.map((g) => g.members),
    );
  });

  it("un groupe verrouillé ne bouge pas (membres et nom)", () => {
    let groups = placeStudent(
      placeStudent(placeStudent(empty(3), "s00", "g2"), "s01", "g2"),
      "s02",
      "g2",
    );
    groups = renameGroup(toggleGroupLock(groups, "g2"), "g2", "Les Licornes");
    const res = redraw({ groups, studentIds: ids(9), seed: "lock" });
    const locked = res.groups.find((g) => g.id === "g2")!;
    expect(locked.members.sort()).toEqual(["s00", "s01", "s02"]);
    expect(locked.name).toBe("Les Licornes");
    expect(res.groups.flatMap((g) => g.members).sort()).toEqual(ids(9));
    expect(res.groups.map((g) => g.members.length)).toEqual([3, 3, 3]);
  });

  it("une personne verrouillée reste dans son groupe", () => {
    let groups = placeStudent(empty(3), "s05", "g3");
    groups = toggleMemberLock(groups, "s05");
    for (const seed of ["a", "b", "c", "d"]) {
      const res = redraw({ groups, studentIds: ids(9), seed });
      expect(res.groups.find((g) => g.id === "g3")!.members).toContain("s05");
      expect(res.groups.flatMap((g) => g.members).sort()).toEqual(ids(9));
    }
  });

  it("des groupes verrouillés trop gros : les autres se partagent le reste", () => {
    let groups = empty(3);
    for (const s of ["s00", "s01", "s02", "s03", "s04"]) groups = placeStudent(groups, s, "g1");
    groups = toggleGroupLock(groups, "g1");
    const res = redraw({ groups, studentIds: ids(9), seed: "big" });
    expect(res.groups[0].members).toHaveLength(5);
    expect(res.groups.flatMap((g) => g.members).sort()).toEqual(ids(9));
    expect(res.groups[1].members.length + res.groups[2].members.length).toBe(4);
  });

  it("évite les binômes déjà vus quand c'est possible", () => {
    const people = ids(8);
    const seen = seenPairs([
      people.slice(0, 2),
      people.slice(2, 4),
      people.slice(4, 6),
      people.slice(6, 8),
    ]);
    const res = redraw({ groups: empty(4), studentIds: people, avoidPairs: seen, seed: "avoid" });
    expect(res.repeatedPairs).toBe(0);
  });
});

describe("plateau", () => {
  it("place, retire, échange", () => {
    let groups = placeStudent(placeStudent(empty(2), "a", "g1"), "b", "g2");
    groups = placeStudent(groups, "a", "g2");
    expect(groups.map((g) => g.members)).toEqual([[], ["b", "a"]]);
    groups = placeStudent(groups, "a", "g1");
    expect(swapStudents(groups, "a", "b").map((g) => g.members)).toEqual([["b"], ["a"]]);
    expect(removeStudent(groups, "b").map((g) => g.members)).toEqual([["a"], []]);
    expect(swapStudents(groups, "a", "inconnu")).toEqual(groups);
  });
  it("sans groupe et bilan", () => {
    const groups = placeStudent(placeStudent(empty(3), "s00", "g1"), "s01", "g1");
    expect(unplaced(groups, ids(4))).toEqual(["s02", "s03"]);
    expect(boardSummary(groups, 4)).toEqual({
      placed: 2,
      total: 4,
      filled: 1,
      empty: 2,
      sizes: "1 groupe de 2",
      spread: 0,
    });
  });
});
