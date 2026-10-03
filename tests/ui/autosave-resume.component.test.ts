import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { XiangqiBoard } from "../../src/ui/XiangqiBoard";
import { GomokuBoard } from "../../src/ui/components/GomokuBoard";
import { BanqiBoard } from "../../src/ui/components/BanqiBoard";
import type { BoardProps } from "../../src/ui/board-props";
import type { GameId } from "../../src/core/game/types";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { emptyBoard } from "../../src/games/banqi/board";
import type { BanqiPiece, BanqiState } from "../../src/games/banqi/types";
import {
  autosaveKey,
  hasAutosave,
  readAutosave,
} from "../../src/core/persistence/autosave";
import { listSaves } from "../../src/core/persistence/local-storage";
import {
  clickCell,
  moveHistoryHeaderText,
  renderedMoveCount,
  replayButton,
  saveCurrentGame,
} from "./board-persistence-helpers";
import {
  boardSnapshot,
  clickReset,
  clickUndo,
  findFinishingSequence,
  moveItemTexts,
  mulberry32,
  playViaUi,
  seedAutosave,
} from "./autosave-helpers";
import { buildState, createPiece } from "../xiangqi/test-helper";

interface GameCase {
  readonly id: GameId;
  readonly Board: ComponentType<BoardProps>;
  /** 用 UI 走兩手以上，回傳走了幾手 */
  readonly play: () => number;
  /** 離「結束」只差最後一手的自動存檔 + 那最後一手（UI 操作） */
  readonly seedNearEnd: () => { finish: () => void };
}

function banqiPiece(
  id: string,
  player: BanqiPiece["player"],
  type: BanqiPiece["type"],
  rank: number
): BanqiPiece {
  return { id, player, type, rank, isRevealed: true };
}

const CASES: readonly GameCase[] = [
  {
    id: "xiangqi",
    Board: XiangqiBoard,
    play: () => {
      clickCell(6, 4);
      clickCell(5, 4);
      clickCell(3, 4);
      clickCell(4, 4);
      return 2;
    },
    seedNearEnd: () => {
      // 黑將孤身在 (0,4)；紅車 (1,0) 封鎖第 1 排，另一紅車一旦上到第 0 排即殺棋。
      const initial = buildState(
        [
          createPiece("rg", "red", "general", 9, 3),
          createPiece("bg", "black", "general", 0, 4),
          createPiece("rc1", "red", "chariot", 1, 0),
          createPiece("rc2", "red", "chariot", 5, 8),
        ],
        "red"
      );
      const engine = createXiangqiEngine();
      const seq = findFinishingSequence(engine, initial, 3);
      seedAutosave(engine, initial, seq.slice(0, -1));
      return { finish: () => playViaUi(seq[seq.length - 1]) };
    },
  },
  {
    id: "gomoku",
    Board: GomokuBoard,
    play: () => {
      clickCell(7, 7);
      clickCell(7, 8);
      clickCell(8, 8);
      return 3;
    },
    seedNearEnd: () => {
      const engine = createGomokuEngine();
      // 黑 (7,3)-(7,6) 四連，白在第 8 排散落；黑下 (7,7) 即五連
      const seq = [
        { row: 7, col: 3 }, { row: 8, col: 3 },
        { row: 7, col: 4 }, { row: 8, col: 5 },
        { row: 7, col: 5 }, { row: 8, col: 7 },
        { row: 7, col: 6 }, { row: 8, col: 9 },
        { row: 7, col: 7 },
      ];
      seedAutosave(engine, engine.createInitialState(), seq.slice(0, -1));
      return { finish: () => playViaUi(seq[seq.length - 1]) };
    },
  },
  {
    id: "banqi",
    Board: BanqiBoard,
    play: () => {
      clickCell(0, 0);
      clickCell(1, 1);
      return 2;
    },
    seedNearEnd: () => {
      // 紅方一車一兵 vs 黑方孤兵：紅方吃掉黑兵即結束
      const board = emptyBoard();
      board[0][0] = banqiPiece("r-c", "red", "chariot", 4);
      board[3][0] = banqiPiece("r-s", "red", "soldier", 1);
      board[2][3] = banqiPiece("b-s", "black", "soldier", 1);
      const initial: BanqiState = {
        board,
        currentPlayer: "red",
        player1Color: "red",
        winner: null,
        moveNumber: 0,
      };
      const engine = createBanqiEngine();
      const seq = findFinishingSequence(engine, initial, 5);
      seedAutosave(engine, initial, seq.slice(0, -1));
      return { finish: () => playViaUi(seq[seq.length - 1]) };
    },
  },
];

function parsedAutosave(id: GameId): { initialState: string; history: unknown[]; state: string } {
  const raw = readAutosave(id);
  if (!raw) throw new Error("expected an autosave to exist");
  return JSON.parse(raw);
}

describe.each(CASES)("自動存檔與續局：$id", ({ id, Board, play, seedNearEnd }) => {
  beforeEach(() => {
    window.localStorage.clear();
    // 暗棋開局會洗牌：固定種子，測試才可重現
    vi.spyOn(Math, "random").mockImplementation(mulberry32(20261003));
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("落子 → 卸載 → 重新掛載：棋譜、盤面、復盤、悔棋都回來", () => {
    const { unmount } = render(createElement(Board));
    const moves = play();
    const snapshotBefore = boardSnapshot();
    const itemsBefore = moveItemTexts();
    expect(renderedMoveCount()).toBe(moves);

    unmount();
    cleanup();

    render(createElement(Board));
    expect(renderedMoveCount()).toBe(moves);
    expect(moveHistoryHeaderText()).toContain(`對局步譜（${moves} 步）`);
    expect(moveItemTexts()).toEqual(itemsBefore);
    expect(boardSnapshot()).toEqual(snapshotBefore);

    // 復盤可用，總步數正確
    expect(replayButton().disabled).toBe(false);
    fireEvent.click(replayButton());
    expect(screen.getByTestId("replay-step-label").textContent).toBe(`0 / ${moves} 步`);
    fireEvent.click(screen.getByTestId("replay-exit"));

    // 悔棋可用，且退回一步
    clickUndo();
    expect(renderedMoveCount()).toBe(moves - 1);
  });

  it("還原後起始局面不變（暗棋不會被重新洗牌），可接著繼續走", () => {
    const { unmount } = render(createElement(Board));
    play();
    const initialBefore = parsedAutosave(id).initialState;
    unmount();
    cleanup();

    // 換一個亂數序列：若還原時偷偷重洗，起始局面就會不同
    vi.spyOn(Math, "random").mockImplementation(mulberry32(7));
    render(createElement(Board));
    expect(parsedAutosave(id).initialState).toBe(initialBefore);
  });

  it("自動存檔不會出現在使用者存檔列表，也不影響手動存檔", () => {
    render(createElement(Board));
    const moves = play();

    expect(window.localStorage.getItem(autosaveKey(id))).not.toBeNull();
    expect(listSaves(id)).toEqual([]);
    expect(listSaves()).toEqual([]);
    // UI 的存檔列表也是空的
    expect(screen.queryByTestId("save-empty")).not.toBeNull();
    expect(document.querySelectorAll('[data-testid^="save-load-"]')).toHaveLength(0);

    saveCurrentGame("手動存檔");
    expect(listSaves(id)).toHaveLength(1);
    expect(listSaves(id)[0].moveCount).toBe(moves);
    expect(document.querySelectorAll('[data-testid^="save-load-"]')).toHaveLength(1);
    expect(window.localStorage.getItem(autosaveKey(id))).not.toBeNull();
  });

  it("按「重新開始」後自動存檔消失，重新掛載是空棋局", () => {
    const { unmount } = render(createElement(Board));
    play();
    expect(hasAutosave(id)).toBe(true);

    clickReset();
    expect(renderedMoveCount()).toBe(0);
    expect(window.localStorage.getItem(autosaveKey(id))).toBeNull();
    expect(hasAutosave(id)).toBe(false);

    unmount();
    cleanup();
    render(createElement(Board));
    expect(renderedMoveCount()).toBe(0);
  });

  it("悔棋回到起點後沒有可續的局", () => {
    render(createElement(Board));
    const moves = play();
    for (let i = 0; i < moves; i++) clickUndo();
    expect(renderedMoveCount()).toBe(0);
    expect(hasAutosave(id)).toBe(false);
  });

  it("對局結束後自動存檔消失（還原一局將結束的棋 → 走最後一手 → 清除）", () => {
    const { finish } = seedNearEnd();
    expect(hasAutosave(id)).toBe(true);

    const { unmount } = render(createElement(Board));
    expect(renderedMoveCount()).toBeGreaterThanOrEqual(1);
    expect(document.querySelector(".gameover")).toBeNull();

    finish();
    expect(document.querySelector(".gameover")).not.toBeNull();
    expect(window.localStorage.getItem(autosaveKey(id))).toBeNull();
    expect(hasAutosave(id)).toBe(false);

    // 重新進入：不會把玩家帶回已分勝負的棋
    unmount();
    cleanup();
    render(createElement(Board));
    expect(renderedMoveCount()).toBe(0);
    expect(document.querySelector(".gameover")).toBeNull();
  });

  it("寫入失敗（QuotaExceededError）：照常下棋、不白屏、不丟例外", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    const { unmount } = render(createElement(Board));
    let moves = 0;
    expect(() => {
      moves = play();
    }).not.toThrow();

    expect(setItem).toHaveBeenCalled();
    // 畫面仍在、棋仍在下
    expect(boardSnapshot().length).toBeGreaterThan(0);
    expect(renderedMoveCount()).toBe(moves);
    expect(document.querySelector(".error, [role='alert']")).toBeNull();
    // 沒存成功就是沒有自動存檔
    expect(window.localStorage.getItem(autosaveKey(id))).toBeNull();

    unmount();
    cleanup();
    vi.restoreAllMocks();
    vi.spyOn(Math, "random").mockImplementation(mulberry32(20261003));
    render(createElement(Board));
    expect(renderedMoveCount()).toBe(0);
  });

  it("localStorage 完全不可讀（getItem 丟例外）：仍能正常開局下棋", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    render(createElement(Board));
    expect(boardSnapshot().length).toBeGreaterThan(0);
    const moves = play();
    expect(renderedMoveCount()).toBe(moves);
  });

  it("自動存檔損毀：視為沒有，開空棋局並清掉壞檔", () => {
    window.localStorage.setItem(autosaveKey(id), "{not valid json");
    render(createElement(Board));
    expect(renderedMoveCount()).toBe(0);
    expect(boardSnapshot().length).toBeGreaterThan(0);
    expect(window.localStorage.getItem(autosaveKey(id))).toBeNull();
  });

  it("自動存檔棋種不符：不還原、不弄壞畫面", () => {
    const otherId: GameId = id === "xiangqi" ? "gomoku" : "xiangqi";
    const other = CASES.find((c) => c.id === otherId)!;
    other.seedNearEnd();
    // 把別的棋種的 envelope 塞進這個棋種的 slot
    window.localStorage.setItem(autosaveKey(id), readAutosave(otherId) as string);

    render(createElement(Board));
    expect(renderedMoveCount()).toBe(0);
    expect(boardSnapshot().length).toBeGreaterThan(0);
  });
});
