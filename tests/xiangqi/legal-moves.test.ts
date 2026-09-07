import { describe, expect, it } from "vitest";
import { getLegalMoves } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Xiangqi Legal Moves & Self-Check Invariant", () => {
  it("filters out moves where the General steps into check", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 0), // col 0 avoids flying general on col 5
      createPiece("bc", "black", "chariot", 2, 3), // controls file 3
    ]);

    const moves = getLegalMoves(s, "red").filter(
      (m) => m.from.row === 9 && m.from.col === 4
    );
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    // (9,3) would walk into the black chariot's line of attack
    expect(dests).not.toContain("9,3");
    expect(dests).toContain("8,4");
    expect(dests).toContain("9,5");
  });

  it("prohibits a piece from moving off a line if doing so exposes flying general", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 4),
      createPiece("shield", "red", "chariot", 5, 4), // sole shield on file 4
    ]);

    const moves = getLegalMoves(s, "red").filter(
      (m) => m.from.row === 5 && m.from.col === 4
    );
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    // Lateral moves off file 4 are illegal (flying general)
    expect(dests).not.toContain("5,3");
    expect(dests).not.toContain("5,5");
    // Vertical moves along file 4 maintain shield and are legal
    expect(dests).toContain("4,4");
    expect(dests).toContain("6,4");
  });

  it("forces player in check to only choose moves that resolve the check", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("bc", "black", "chariot", 9, 0), // attacking general directly along rank 9
      createPiece("rc", "red", "chariot", 5, 2), // can interpose or General can move
      createPiece("unrelated", "red", "soldier", 6, 8),
    ]);

    const legal = getLegalMoves(s, "red");
    // Unrelated soldier moves that don't stop check are illegal
    const soldierMoves = legal.filter((m) => m.from.row === 6 && m.from.col === 8);
    expect(soldierMoves).toHaveLength(0);

    // General moving out of rank 9 or Red chariot blocking (9,2) must be in legal
    const genMoves = legal.filter((m) => m.from.row === 9 && m.from.col === 4);
    expect(genMoves.map((m) => `${m.to.row},${m.to.col}`)).toContain("8,4");

    const blockMoves = legal.filter((m) => m.from.row === 5 && m.from.col === 2);
    expect(blockMoves.map((m) => `${m.to.row},${m.to.col}`)).toContain("9,2");
  });
});
