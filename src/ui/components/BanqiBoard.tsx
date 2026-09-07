import { useMemo, useState } from "react";
import { createBanqiEngine } from "../../games/banqi/engine";
import { useGameSession } from "../hooks/useGameSession";
import { StatusBar } from "./StatusBar";
import type { BanqiMove, BanqiPiece, BanqiPlayer, BanqiState } from "../../games/banqi/types";
import type { PieceType } from "../../games/xiangqi/types";
import type { Player } from "../../core/game/types";

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

export function BanqiBoard() {
  const engine = useMemo(() => createBanqiEngine(), []);
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
  } = useGameSession<BanqiState, BanqiMove>(engine);

  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  const targets = selected
    ? legalMoves
        .filter(
          (m): m is { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } } =>
            m.type === "move" && m.from.row === selected.row && m.from.col === selected.col
        )
        .map((m) => m.to)
    : [];

  function handleCellClick(row: number, col: number) {
    if (isGameOver) return;
    const piece = state.board[row][col];

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

    // 3. Clicking own revealed piece -> SELECT
    if (piece && piece.isRevealed && piece.player === currentPlayer) {
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

  const formatPlayer = (p: Player) => {
    if (state.player1Color === null) {
      return "尚未決定（翻子決定）";
    }
    return p === "red" ? "紅方 (Red)" : "黑方 (Black)";
  };

  return (
    <section className="game-layout">
      <div className="board-panel">
        <StatusBar
          currentPlayer={currentPlayer}
          isGameOver={isGameOver}
          winner={winner}
          isDraw={isDraw}
          error={error}
          onUndo={handleUndo}
          onReset={handleReset}
          formatPlayer={formatPlayer}
        />

        <div
          className="banqi-board"
          data-testid="banqi-board"
          role="grid"
          aria-label="4x8 暗棋棋盤"
        >
          {state.board.map((row, r) =>
            row.map((piece: BanqiPiece | null, c: number) => {
              const isSelected = selected?.row === r && selected?.col === c;
              const isTarget = targets.some((t) => t.row === r && t.col === c);

              return (
                <button
                  key={`${r}-${c}`}
                  className={`banqi-cell ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={isGameOver}
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

      <aside className="side-panel">
        <h2>暗棋 (Banqi)</h2>
        <p className="engine-badge">Engine: BanqiEngine (4×8 半盤)</p>

        <div className="banqi-legend">
          <p>
            <strong>當前執方：</strong>
            {state.player1Color === null ? (
              <span className="unassigned-badge">首著翻牌決定執色</span>
            ) : (
              <span>已決定（紅 / 黑輪流）</span>
            )}
          </p>
        </div>

        <p className="muted">
          規則說明：
          <br />
          • 將/帥(7) &gt; 士/仕(6) &gt; 象/相(5) &gt; 車/俥(4) &gt; 馬/傌(3) &gt; 炮/包(2) &gt; 卒/兵(1)
          <br />
          • <strong>特殊相剋</strong>：卒/兵可吃將/帥；將/帥不可吃卒/兵。
          <br />
          • <strong>炮/包</strong>：相鄰走 1 格（不可吃子）；跳吃時中間須隔恰好 1 顆棋子，可吃任意階級敵子。
          <br />
          • 暗棋不可被吃，吃光對方所有棋子即獲勝。
        </p>
      </aside>
    </section>
  );
}
