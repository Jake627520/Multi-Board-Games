import { useMemo } from "react";
import { createGomokuEngine } from "../../games/gomoku/engine";
import { useGameSession } from "../hooks/useGameSession";
import { StatusBar } from "./StatusBar";
import type { GomokuMove, GomokuPlayer, GomokuState } from "../../games/gomoku/types";

export function GomokuBoard() {
  const engine = useMemo(() => createGomokuEngine(), []);
  const {
    state,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    error,
    move,
    undo,
    reset,
  } = useGameSession<GomokuState, GomokuMove>(engine);

  function handleCellClick(row: number, col: number) {
    if (isGameOver || state.board[row][col] !== null) return;
    move({ row, col });
  }

  const formatPlayer = (p: string) => (p === "black" ? "黑子 (Black)" : "白子 (White)");

  return (
    <section className="game-layout">
      <div className="board-panel">
        <StatusBar
          currentPlayer={currentPlayer}
          isGameOver={isGameOver}
          winner={winner}
          isDraw={isDraw}
          error={error}
          onUndo={undo}
          onReset={reset}
          formatPlayer={formatPlayer}
        />

        <div
          className="gomoku-board"
          data-testid="gomoku-board"
          role="grid"
          aria-label="15x15 五子棋盤"
        >
          {state.board.map((row, r) =>
            row.map((stone: GomokuPlayer | null, c: number) => {
              const isEmpty = stone === null;
              return (
                <button
                  key={`${r}-${c}`}
                  className={`gomoku-cell ${isEmpty ? "empty" : ""}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={isGameOver || !isEmpty}
                  aria-label={`${r}-${c}${stone ? ` ${stone}` : " 空位"}`}
                >
                  {stone && (
                    <span
                      className={`stone ${stone}`}
                      data-testid={`stone-${stone}`}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <aside className="side-panel">
        <h2>五子棋 (Gomoku)</h2>
        <p className="engine-badge">Engine: GomokuEngine (15×15)</p>
        <p className="muted">
          五子棋 Free-style 規則：黑方先行，先在橫、直、斜任一方向連成五子者獲勝。
        </p>

        <div className="legend">
          <div>⚫ 黑子：先行方</div>
          <div>⚪ 白子：後行方</div>
          <div>🏆 5 連珠即勝</div>
        </div>
      </aside>
    </section>
  );
}
