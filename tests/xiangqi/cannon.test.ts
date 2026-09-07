import { describe, expect, it } from "vitest";
import { getLegalMoves } from "../../src/games/xiangqi/rules";
import { buildState, createPiece } from "./test-helper";

describe("Cannon Movement", () => {
  it("moves orthogonally without jumping over any piece when quiet", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("cn", "red", "cannon", 7, 4),
      createPiece("obs", "red", "soldier", 5, 4),
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 7 && m.from.col === 4);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    // Can step to (6,4)
    expect(dests).toContain("6,4");
    // Cannot land on obstacle without capture
    expect(dests).not.toContain("5,4");
    // Cannot jump quietly to (4,4)
    expect(dests).not.toContain("4,4");
  });

  it("captures an enemy piece across exactly one screen", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("cn", "red", "cannon", 7, 4),
      createPiece("screen", "red", "soldier", 5, 4), // 1 screen
      createPiece("target", "black", "soldier", 2, 4), // enemy piece
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 7 && m.from.col === 4);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).toContain("2,4");
  });

  it("prohibits capture with zero screen (direct step on enemy)", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("cn", "red", "cannon", 7, 4),
      createPiece("target", "black", "soldier", 5, 4), // directly ahead, 0 screens
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 7 && m.from.col === 4);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).not.toContain("5,4");
  });

  it("prohibits capture across two screens", () => {
    const s = buildState([
      createPiece("rg", "red", "general", 9, 4),
      createPiece("bg", "black", "general", 0, 3),
      createPiece("cn", "red", "cannon", 7, 4),
      createPiece("screen1", "red", "soldier", 5, 4),
      createPiece("screen2", "black", "soldier", 4, 4),
      createPiece("target", "black", "soldier", 2, 4),
    ]);

    const moves = getLegalMoves(s, "red").filter((m) => m.from.row === 7 && m.from.col === 4);
    const dests = moves.map((m) => `${m.to.row},${m.to.col}`);

    expect(dests).not.toContain("2,4");
  });
});
