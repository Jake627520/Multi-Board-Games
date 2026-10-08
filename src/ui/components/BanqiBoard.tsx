import { useEffect, useMemo, useState } from "react";
import { createBanqiEngine } from "../../games/banqi/engine";
import { useGameSession } from "../hooks/useGameSession";
import { StatusBar } from "./StatusBar";
import { BoardSidePanel } from "./BoardSidePanel";
import type { AiLevelLabels } from "./AiLevelSelector";
import type { AiLevel } from "./AiLevelSelector";
import { type GameMode } from "./GameModeSelector";
import { createBanqiAiLevel1, createBanqiAiLevel2 } from "../../games/banqi/ai";
import type { BanqiMove, BanqiPlayer, BanqiState, BanqiViewState } from "../../games/banqi/types";
import type { PieceType } from "../../games/xiangqi/types";
import type { Player } from "../../core/game/types";
import type { BoardProps } from "../board-props";
import { confirmDiscardGame } from "../confirm-discard";
import { loadSavedUi } from "../saved-ui";
import { banqiMoveCells } from "../move-cells";

const LABELS: Record<BanqiPlayer, Record<PieceType, string>> = {
  red: {
    general: "帥",
    advisor: "仕",
    elephant: "相",
    chariot: "俥",
    horse: "傌",
    cannon: "炮",
    soldier: "兵",
  },
  black: {
    general: "將",
    advisor: "士",
    elephant: "象",
    chariot: "車",
    horse: "馬",
    cannon: "包",
    soldier: "卒",
  },
};

const AVAILABLE_PLAYERS: { id: Player; label: string }[] = [
  { id: "red", label: "先手 (玩家先翻)" },
  { id: "black", label: "後手 (電腦先翻)" },
];

/**
 * 暗棋是難度階梯：穩健型（Level 2）大幅強過進取型（Level 1），由
 * tests/banqi/ai-strength-ladder.test.ts 守門。仍傳自己的標籤，是因為預設的
 * 「Level 2 (Minimax)」對暗棋不成立——它的 Level 2 是只讀明子的貪婪，不是搜尋。
 *
 * 曾經標成「對手風格」並宣稱兩者等強，依據是 14:14 的對打結果。那個數字是
 * 量測錯誤：勝負用開局的 currentPlayer 歸屬，而首翻前那只是先手的佔位標籤，
 * 首翻翻黑子的那一半局被歸錯邊，真實差距被拉成五五波。
 */
const BANQI_AI_LABELS: AiLevelLabels = {
  heading: "電腦難度：",
  l1: "Level 1 (進取)",
  l2: "Level 2 (穩健)",
};

export function BanqiBoard({ onProgressChange, initialMode }: BoardProps) {
  const engine = useMemo(() => createBanqiEngine(), []);

  // 自動存檔附帶的 UI 設定：只在掛載時讀一次，當作下面幾個 state 的初始值
  const [saved] = useState(() =>
    loadSavedUi("banqi", AVAILABLE_PLAYERS.map((p) => p.id))
  );
  const [mode, setMode] = useState<GameMode>(saved.mode ?? initialMode ?? "pvp");
  const [humanPlayer, setHumanPlayer] = useState<Player>(saved.humanPlayer ?? "red");
  const [aiLevel, setAiLevel] = useState<AiLevel>(saved.aiLevel ?? "l1");
  const [establishedP1Color, setEstablishedP1Color] = useState<Player | null>(null);

  const aiPlayer = useMemo(
    () => (aiLevel === "l2" ? createBanqiAiLevel2() : createBanqiAiLevel1()),
    [aiLevel]
  );

  const aiColor = useMemo(() => {
    if (mode !== "pve") return undefined;
    if (establishedP1Color === null) {
      return humanPlayer === "red" ? "black" : "red";
    }
    return humanPlayer === "red"
      ? (establishedP1Color === "red" ? "black" : "red")
      : establishedP1Color;
  }, [mode, humanPlayer, establishedP1Color]);

  const session = useGameSession<BanqiState, BanqiMove, BanqiViewState>(engine, {
    aiPlayer: mode === "pve" ? aiPlayer : undefined,
    aiColor,
    formatMove: (m) =>
      m.type === "flip"
        ? `翻 (${m.pos.row},${m.pos.col})`
        : `(${m.from.row},${m.from.col})→(${m.to.row},${m.to.col})`,
    moveCells: banqiMoveCells,
    autosave: true,
    autosaveUi: { mode, humanPlayer, aiLevel },
  });

  const {
    viewState,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    legalMoves,
    error,
    move,
    undo,
    reset,
    isAiThinking,
    isReplayMode,
    inProgress,
    lastMoveCells,
  } = session;

  // 同步首翻決定的執色
  if (viewState.player1Color !== establishedP1Color) {
    setEstablishedP1Color(viewState.player1Color);
  }

  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  // BanqiMove 本身就是判別聯集（type: "flip" | "move"），用 flatMap 讓 TS
  // 在同一個運算式裡完成窄化，不必再手寫一份重複描述 "move" 分支形狀的 type predicate。
  const targets = selected && !isReplayMode
    ? legalMoves.flatMap((m) =>
        m.type === "move" && m.from.row === selected.row && m.from.col === selected.col
          ? [m.to]
          : []
      )
    : [];

  function handleModeChange(newMode: GameMode) {
    // 點已經選中的模式不是切換：不能清局
    if (newMode === mode) return;
    if (!confirmDiscardGame(inProgress, "切換對戰模式")) return;
    setMode(newMode);
    reset();
    setSelected(null);
    setEstablishedP1Color(null);
  }

  function handleHumanPlayerChange(player: Player) {
    if (player === humanPlayer) return;
    if (!confirmDiscardGame(inProgress, "更換先後手")) return;
    setHumanPlayer(player);
    reset();
    setSelected(null);
    setEstablishedP1Color(null);
  }

  function handleCellClick(row: number, col: number) {
    if (isGameOver || isReplayMode || isAiThinking) return;
    if (mode === "pve" && aiColor && currentPlayer === aiColor) return;
    const piece = viewState.board[row][col];

    // 1. If user already selected a piece, check if clicking a target
    if (selected) {
      const isTarget = targets.some((t) => t.row === row && t.col === col);
      if (isTarget) {
        move({ type: "move", from: selected, to: { row, col } });
        setSelected(null);
        return;
      }

      // Re-selecting own revealed piece
      if (piece && piece.isRevealed && piece.player === currentPlayer) {
        setSelected({ row, col });
        return;
      }

      setSelected(null);
      return;
    }

    // 2. Clicking a face-down piece -> FLIP!
    if (piece && !piece.isRevealed) {
      move({ type: "flip", pos: { row, col } });
      return;
    }

    // 3. Selecting own revealed piece
    if (piece && piece.isRevealed && piece.player === currentPlayer) {
      setSelected({ row, col });
    }
  }

  function handleAiLevelChange(level: AiLevel) {
    // 只換對手，不動棋局（見 XiangqiBoard 的同名函式）。
    // establishedP1Color 也不清：棋局既然留著，首翻決定的執色就仍然成立，
    // 清掉只會讓鏡像與 viewState.player1Color 短暫不一致。
    setAiLevel(level);
    setSelected(null);
  }

  function handleReset() {
    if (isReplayMode) return; // 復盤中不可重新開始（按鈕也已停用）
    if (!confirmDiscardGame(inProgress, "重新開始")) return;
    reset();
    setSelected(null);
    setEstablishedP1Color(null);
  }

  function handleUndo() {
    undo();
    setSelected(null);
  }

  // 回報「本局是否已開始」給 App（切換遊戲 / 回首頁前的確認依據）
  // 排除已結束的對局：結束時自動存檔已被清掉，沒有東西需要保存，不該再警告
  useEffect(() => {
    onProgressChange?.(inProgress);
  }, [inProgress, onProgressChange]);

  const formatPlayer = (p: string) => (p === "red" ? "紅方 (Red)" : "黑方 (Black)");

  return (
    <section className="game-layout">
      <div className="board-panel">
        <StatusBar
          currentPlayer={currentPlayer}
          isGameOver={isGameOver}
          winner={winner}
          isDraw={isDraw}
          error={error}
          isAiThinking={isAiThinking}
          onUndo={handleUndo}
          onReset={handleReset}
          isReplayMode={isReplayMode}
          formatPlayer={formatPlayer}
        />

        <div
          className="banqi-board"
          data-testid="banqi-board"
          role="grid"
          aria-label="4x8 半盤暗棋盤"
        >
          {viewState.board.map((row, r) =>
            row.map((piece, c) => {
              const isSelected = selected?.row === r && selected?.col === c;
              const isTarget = targets.some((t) => t.row === r && t.col === c);
              const isLastMove = lastMoveCells.has(`${r},${c}`);

              return (
                <button
                  key={`${r}-${c}`}
                  className={`banqi-cell ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""} ${isLastMove ? "last-move" : ""}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={isGameOver || isReplayMode}
                  aria-label={`${r}-${c}${
                    piece
                      ? piece.isRevealed
                        ? ` ${LABELS[piece.player][piece.type]}`
                        : " 暗棋"
                      : " 空位"
                  }`}
                >
                  {piece && (
                    <div
                      className={`banqi-piece ${
                        piece.isRevealed ? `revealed ${piece.player}` : "face-down"
                      }`}
                      data-testid={piece.isRevealed ? `piece-${piece.player}-${piece.type}` : "piece-face-down"}
                    >
                      {piece.isRevealed ? LABELS[piece.player][piece.type] : "🀄"}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <BoardSidePanel
        session={session}
        latinName={engine.latinName}
        name={engine.name}
        badge="8 × 4 半盤"
        mode={mode}
        humanPlayer={humanPlayer}
        availablePlayers={AVAILABLE_PLAYERS}
        onModeChange={handleModeChange}
        onHumanPlayerChange={handleHumanPlayerChange}
        aiLevel={aiLevel}
        onAiLevelChange={handleAiLevelChange}
        aiLevelLabels={BANQI_AI_LABELS}
        formatPlayer={formatPlayer}
        disabled={isAiThinking}
        beforeHistory={
          <div className="banqi-legend">
            <p>
              <strong>當前執方：</strong>
              {viewState.player1Color === null ? (
                <span className="unassigned-badge">
                  {mode === "pve"
                    ? `首著翻牌決定執色（${humanPlayer === "red" ? "玩家先翻" : "電腦先翻"}）`
                    : "首著翻牌決定執色"}
                </span>
              ) : (
                <span>
                  {mode === "pve"
                    ? `玩家執${
                        (humanPlayer === "red" ? viewState.player1Color : (viewState.player1Color === "red" ? "black" : "red")) === "red"
                          ? "紅方"
                          : "黑方"
                      }、電腦執${aiColor === "red" ? "紅方" : "黑方"}`
                    : "已決定（紅 / 黑輪流）"}
                </span>
              )}
            </p>
          </div>
        }
      >
        <div className="muted">
          <p>
            <strong>規則說明 (Rules)</strong>：
            <br />
            • <strong>回合 (Turn)</strong>：每回合二選一——翻開一顆暗子，或移動自己的一顆明子。首翻翻出的顏色就是你的顏色；首翻之前不能移動。
            <span className="en-rule">Each turn, either flip a face-down piece or move one of your revealed pieces. Your colour is whatever your first flip reveals; nothing can move before then.</span>
            • <strong>走法 (Movement)</strong>：所有棋子都直走一格。吃子時只能吃<strong>階級相同或較低</strong>的敵子。
            <span className="en-rule">Every piece moves one step orthogonally. It may capture an enemy of equal or lower rank.</span>
            • <strong>階級 (Hierarchy)</strong>：將/帥(7)、士/仕(6)、象/相(5)、車/俥(4)、馬/傌(3)、炮/包(2)、卒/兵(1)。同階可以互吃。
            <span className="en-rule">Ranks: General 7, Advisor 6, Elephant 5, Chariot 4, Horse 3, Cannon 2, Soldier 1. Equal ranks can capture each other.</span>
            • <strong>特殊相剋 (Special Capture)</strong>：卒/兵可吃將/帥；將/帥不可吃卒/兵。
            <span className="en-rule">Soldiers can capture Generals; Generals cannot capture Soldiers.</span>
            • <strong>炮/包 (Cannon)</strong>：移動時直走一格到空格；吃子時沿直線跳過<strong>恰好一顆</strong>棋子（明暗、敵我皆可當砲架），可吃任意階級的敵子。
            <span className="en-rule">Cannons move one step into an empty square. To capture, jump over exactly one piece of any kind onto an enemy of any rank.</span>
            • <strong>勝負 (Victory)</strong>：吃光對方所有棋子，或對方輪到時無棋可走，即獲勝。暗子不可被吃。
            <span className="en-rule">Win by capturing every enemy piece, or when your opponent has no legal move on their turn. Face-down pieces cannot be captured.</span>
            • <strong>和局 (Draw)</strong>：同一局面出現三次，或雙方合計連續 60 手都沒有翻子也沒有吃子。
            <span className="en-rule">Drawn when the same position occurs three times, or after 60 consecutive moves by both sides with no flip or capture.</span>
          </p>
        </div>
      </BoardSidePanel>
    </section>
  );
}
