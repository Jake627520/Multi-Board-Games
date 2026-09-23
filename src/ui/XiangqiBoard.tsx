import { useEffect, useMemo, useState } from "react";
import { createXiangqiEngine } from "../games/xiangqi/engine";
import {
  createXiangqiAiLevel1,
  createXiangqiAiLevel2,
} from "../games/xiangqi/ai";
import { toXiangqiNotation } from "../games/xiangqi/notation";
import { isInCheck } from "../games/xiangqi/rules";
import { useGameSession } from "./hooks/useGameSession";
import { StatusBar } from "./components/StatusBar";
import { type GameMode } from "./components/GameModeSelector";
import { BoardSidePanel } from "./components/BoardSidePanel";
import type { AiLevel } from "./components/AiLevelSelector";
import type { Piece, XiangqiMove, XiangqiState } from "../games/xiangqi/types";
import type { Player } from "../core/game/types";
import type { BoardProps } from "./board-props";

const labels: Record<Piece["type"], string> = {
  general: "將",
  advisor: "士",
  elephant: "象",
  horse: "馬",
  chariot: "車",
  cannon: "炮",
  soldier: "卒",
};

const AVAILABLE_PLAYERS: { id: Player; label: string }[] = [
  { id: "red", label: "🟥 紅方（先手）" },
  { id: "black", label: "⬛ 黑方（後手）" },
];

export function XiangqiBoard({ onProgressChange }: BoardProps) {
  const engine = useMemo(() => createXiangqiEngine(), []);
  const [aiLevel, setAiLevel] = useState<AiLevel>("l1");
  const aiPlayer = useMemo(
    () => (aiLevel === "l2" ? createXiangqiAiLevel2() : createXiangqiAiLevel1()),
    [aiLevel]
  );

  const [mode, setMode] = useState<GameMode>("pvp");
  const [humanPlayer, setHumanPlayer] = useState<Player>("red");

  const aiColor: Player | undefined =
    mode === "pve" ? (humanPlayer === "red" ? "black" : "red") : undefined;

  const session = useGameSession<XiangqiState, XiangqiMove>(engine, {
    aiPlayer: mode === "pve" ? aiPlayer : undefined,
    aiColor,
    formatMove: toXiangqiNotation,
  });

  const {
    viewState,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    legalMoves,
    error,
    isAiThinking,
    history,
    move,
    undo,
    reset,
    isReplayMode,
  } = session;

  const [selected, setSelected] = useState<{ row: number; col: number } | null>(
    null
  );

  const targets = selected && !isReplayMode
    ? legalMoves.filter(
        (m) => m.from.row === selected.row && m.from.col === selected.col
      )
    : [];

  function clickCell(row: number, col: number) {
    if (isAiThinking || isReplayMode || isGameOver) return;
    if (mode === "pve" && currentPlayer !== humanPlayer) return;

    const piece = viewState.board[row][col];

    if (selected) {
      const targetMove = targets.find(
        (m) => m.to.row === row && m.to.col === col
      );
      if (targetMove) {
        const success = move(targetMove);
        if (success) {
          setSelected(null);
          return;
        }
      }
      if (piece?.player === currentPlayer) {
        setSelected({ row, col });
      } else {
        setSelected(null);
      }
      return;
    }

    if (piece?.player === currentPlayer) {
      setSelected({ row, col });
    }
  }

  function handleModeChange(newMode: GameMode) {
    setMode(newMode);
    reset();
    setSelected(null);
  }

  function handleHumanPlayerChange(p: Player) {
    setHumanPlayer(p);
    reset();
    setSelected(null);
  }

  function handleAiLevelChange(level: AiLevel) {
    // 只換對手，不動棋局。切換難度把進行中的對局清掉是無預警的資料遺失，
    // 與切換遊戲時會先確認的處理自相矛盾。
    setAiLevel(level);
    setSelected(null);
  }

  function handleReset() {
    reset();
    setSelected(null);
  }

  function handleUndo() {
    undo();
    setSelected(null);
  }

  // 回報「本局是否已開始」給 App（切換遊戲 / 回首頁前的確認依據）
  const inProgress = history.length > 0 || isReplayMode;
  useEffect(() => {
    onProgressChange?.(inProgress);
  }, [inProgress, onProgressChange]);

  const formatPlayer = (p: string) => (p === "red" ? "紅方 (Red)" : "黑方 (Black)");
  const inCheck = isInCheck(viewState, currentPlayer);

  return (
    <section className="game-layout">
      <div className="board-panel">
        <StatusBar
          currentPlayer={currentPlayer}
          isGameOver={isGameOver}
          winner={winner}
          isDraw={isDraw}
          inCheck={inCheck}
          error={error}
          isAiThinking={isAiThinking}
          onUndo={handleUndo}
          onReset={handleReset}
          formatPlayer={formatPlayer}
        />

        <div className="xiangqi-board" data-testid="xiangqi-board">
          {viewState.board.map((row, r) =>
            row.map((piece, c) => {
              const isSelected = selected?.row === r && selected?.col === c;
              const isTarget = targets.some(
                (m) => m.to.row === r && m.to.col === c
              );
              return (
                <button
                  key={`${r}-${c}`}
                  className={`cell ${isSelected ? "selected" : ""} ${
                    isTarget ? "target" : ""
                  }`}
                  onClick={() => clickCell(r, c)}
                  disabled={isAiThinking || isReplayMode}
                  aria-label={`${r}-${c}${
                    piece ? ` ${piece.player} ${piece.type}` : " empty"
                  }`}
                >
                  {piece && (
                    <span
                      className={`piece ${piece.player}`}
                      data-testid={`piece-${piece.player}-${piece.type}`}
                    >
                      {labels[piece.type]}
                    </span>
                  )}
                </button>
              );
            })
          )}

          {/* 九宮斜線與楚河漢界：純 CSS 疊層，不參與 grid 排列 */}
          <span className="palace palace-black" aria-hidden="true" />
          <span className="palace palace-red" aria-hidden="true" />
          <div className="river" aria-hidden="true">
            楚河　　漢界
          </div>
        </div>
      </div>

      <BoardSidePanel
        session={session}
        latinName={engine.latinName}
        name={engine.name}
        badge="9 × 10 棋盤"
        mode={mode}
        humanPlayer={humanPlayer}
        availablePlayers={AVAILABLE_PLAYERS}
        onModeChange={handleModeChange}
        onHumanPlayerChange={handleHumanPlayerChange}
        aiLevel={aiLevel}
        onAiLevelChange={handleAiLevelChange}
        formatPlayer={formatPlayer}
        disabled={isAiThinking}
      >
        <div className="muted">
          <p>
            <strong>規則說明 (Rules)</strong>：
            <br />
            • <strong>走法 (Movement)</strong>：車直行、炮隔一子吃、馬走日（蹩馬腳不可行）、象走田（塞象眼不可行）且不過河；士與將帥限走九宮，士走斜、將帥走直線一格。兵/卒過河前只能前進，過河後可左右平移。
            <span className="en-rule">Chariots move straight. Cannons jump over one piece to capture. Horses move in an L-step (blockable). Elephants move 2 diagonal steps on home side. Advisors &amp; Generals stay in palace. Soldiers move forward, gaining horizontal moves across river.</span>
            • <strong>將軍 (Check)</strong>：任一著法使對方將帥立即受攻擊即為將軍，被將方必須應將；兩方將帥不可在同一直線上直接照面（白臉將）。
            <span className="en-rule">Direct threat to the enemy General is Check. Players must respond. Generals cannot face each other directly on an open file (Flying General rule).</span>
            • <strong>勝負 (End Game)</strong>：對方被將死或無合法著法（困斃）即獲勝；長將、長捉等循環局面依規則判負或和局。
            <span className="en-rule">Checkmate or stalemate the enemy King to win. Perpetual check results in a loss or draw.</span>
          </p>
        </div>

        <div className="legend">
          <div>🟥 紅方 (Red)：先行 (First)</div>
          <div>⬛ 黑方 (Black)：後行 (Second)</div>
          <div>● 可移動之合法落點 (Legal Target)</div>
        </div>
      </BoardSidePanel>
    </section>
  );
}