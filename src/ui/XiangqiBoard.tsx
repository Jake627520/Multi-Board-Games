import { useMemo, useState } from "react";
import { createXiangqiEngine } from "../games/xiangqi/engine";
import { createXiangqiAiLevel1 } from "../games/xiangqi/ai";
import { toXiangqiNotation } from "../games/xiangqi/notation";
import { isInCheck } from "../games/xiangqi/rules";
import { useGameSession } from "./hooks/useGameSession";
import { StatusBar } from "./components/StatusBar";
import { GameModeSelector, type GameMode } from "./components/GameModeSelector";
import { MoveHistory, type FormattedMove } from "./components/MoveHistory";
import type { Piece, XiangqiMove, XiangqiState } from "../games/xiangqi/types";
import type { Player } from "../core/game/types";

const labels: Record<Piece["type"], string> = {
  general: "將",
  advisor: "士",
  elephant: "象",
  horse: "馬",
  chariot: "車",
  cannon: "炮",
  soldier: "卒",
};

const AVAILABLE_PLAYERS = [
  { id: "red", label: "🟥 紅方（先手）" },
  { id: "black", label: "⬛ 黑方（後手）" },
];

export function XiangqiBoard() {
  const engine = useMemo(() => createXiangqiEngine(), []);
  const aiPlayer = useMemo(() => createXiangqiAiLevel1(), []);

  const [mode, setMode] = useState<GameMode>("pvp");
  const [humanPlayer, setHumanPlayer] = useState<Player>("red");

  const aiColor: Player | undefined =
    mode === "pve" ? (humanPlayer === "red" ? "black" : "red") : undefined;

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
  } = useGameSession<XiangqiState, XiangqiMove>(engine, {
    aiPlayer: mode === "pve" ? aiPlayer : undefined,
    aiColor,
    formatMove: toXiangqiNotation,
  });

  const [selected, setSelected] = useState<{ row: number; col: number } | null>(
    null
  );

  const targets = selected
    ? legalMoves.filter(
        (m) => m.from.row === selected.row && m.from.col === selected.col
      )
    : [];

  function clickCell(row: number, col: number) {
    if (isAiThinking) return;
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

  function handleReset() {
    reset();
    setSelected(null);
  }

  function handleUndo() {
    undo();
    setSelected(null);
  }

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
                  disabled={isAiThinking}
                  aria-label={`${r}-${c}${
                    piece ? ` ${labels[piece.type]}` : ""
                  }`}
                >
                  {piece && (
                    <span className={`piece ${piece.player}`}>
                      {labels[piece.type]}
                    </span>
                  )}
                </button>
              );
            })
          )}
          <div className="river">楚河　　漢界</div>
        </div>
      </div>

      <aside className="side-panel">
        <h2>中國象棋 (Xiangqi)</h2>
        <p className="engine-badge">Engine: XiangqiEngine (9×10)</p>

        <GameModeSelector
          mode={mode}
          humanPlayer={humanPlayer}
          availablePlayers={AVAILABLE_PLAYERS}
          onModeChange={handleModeChange}
          onHumanPlayerChange={handleHumanPlayerChange}
          disabled={isAiThinking}
        />

        <MoveHistory
          moves={history.map((h) => ({
            player: h.player,
            notation: h.notation ?? "",
          }))}
          formatPlayer={formatPlayer}
        />

        <p className="muted">
          規則層與 React UI 嚴格分離，UI 不具任何遊戲規則邏輯。
        </p>

        <div className="legend">
          <div>🟥 紅方：先行</div>
          <div>⬛ 黑方：後行</div>
          <div>● 可移動之合法落點</div>
        </div>
      </aside>
    </section>
  );
}