import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { GomokuBoard } from "../../src/ui/components/GomokuBoard";
import { GameSession } from "../../src/core/game/session";
import { SaveManager } from "../../src/core/persistence/save-manager";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { loadFirstSave, seedLocalSave } from "./board-persistence-helpers";

/**
 * 規則模式的顯示必須跟著實際狀態，不是本地 state。
 * ruleMode 這個 state 只決定「開新局用哪個模式」；載入存檔會連同存檔裡的
 * ruleMode 一起還原，引擎依狀態執行禁手——先前顯示仍停在自由規則，於是
 * 畫面寫「自由規則」而黑方下三三卻被擋，使用者只會看到英文 Illegal move。
 */
describe("五子棋規則模式顯示", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("載入禁手存檔後，規則按鈕要跟著切到禁手", () => {
    const engine = createGomokuEngine("forbidden_moves");
    const session = new GameSession(engine);
    session.move({ row: 7, col: 7 }, "H8");
    seedLocalSave({
      id: "probe",
      name: "禁手局",
      gameId: "gomoku",
      envelopeJson: new SaveManager().save(session, engine),
      moveCount: 1,
    });

    render(createElement(GomokuBoard));
    expect(screen.getByTestId("rule-freestyle").className).toContain("active");

    loadFirstSave();

    expect(screen.getByTestId("rule-forbidden").className).toContain("active");
    expect(screen.getByTestId("rule-freestyle").className).not.toContain("active");
  });
});
