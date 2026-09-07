import { useMemo, useState } from "react";
import { createXiangqiEngine } from "../games/xiangqi/engine";
import { isInCheck } from "../games/xiangqi/rules";
import { useGameSession } from "./hooks/useGameSession";
import { StatusBar } from "./components/StatusBar";
import type { Piece, XiangqiMove, XiangqiState } from "../games/xiangqi/types";

const labels: Record<Piece["type"], string> = {
  general: "將",
  advisor: "士",
  elephant: "象",
  horse: "馬",
  chariot: "車",
  cannon: "炮",
  soldier: "卒",
};

export function XiangqiBoard() {
  const engine = useMemo(() => createXiangqiEngine(), []);
  const {
    state,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    legalMoves,
    error,
    move,
    undo,
    reset,
  } = useGameSession<XiangqiState, XiangqiMove>(engine);

  const [selected, setSelected] = useState<{ row: number; col: number } | null>(
    null
  );

  const targets = selected
    ? legalMoves.filter(
        (m) => m.from.row === selected.row && m.from.col === selected.col
      )
    : [];

  function clickCell(row: number, col: number) {
    const piece = state.board[row][col];

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
      if (piece?.player === state.currentPlayer) {
        setSelected({ row, col });
      } else {
        setSelected(null);
      }
      return;
    }

    if (piece?.player === state.currentPlayer) {
      setSelected({ row, col });
    }
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
  const inCheck = isInCheck(state, state.currentPlayer);

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
          onUndo={handleUndo}
          onReset={handleReset}
          formatPlayer={formatPlayer}
        />

        <div className="xiangqi-board" data-testid="xiangqi-board">
          {state.board.map((row, r) =>
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