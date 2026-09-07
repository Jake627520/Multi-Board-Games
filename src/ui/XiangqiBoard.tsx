import { useMemo, useState } from "react";
import { GameSession } from "../core/game/session";
import { createXiangqiEngine } from "../games/xiangqi/engine";
import type { Piece, XiangqiMove, XiangqiState } from "../games/xiangqi/types";
import { isInCheck } from "../games/xiangqi/rules";

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
  const session = useMemo(() => new GameSession(createXiangqiEngine()), []);
  const [state, setState] = useState<XiangqiState>(session.getState());
  const [selected, setSelected] = useState<{row:number;col:number} | null>(null);
  const [error, setError] = useState("");

  // UI receives legal moves from the game engine; it never implements rules.
  const engine = useMemo(() => createXiangqiEngine(), []);
  const moves = engine.getLegalMoves(state);

  const targets = selected
    ? moves.filter(m => m.from.row === selected.row && m.from.col === selected.col)
    : [];

  function clickCell(row: number, col: number) {
    setError("");
    const piece = state.board[row][col];

    if (selected) {
      const move = targets.find(m => m.to.row === row && m.to.col === col);
      if (move) {
        try {
          setState(session.move(move));
          setSelected(null);
          return;
        } catch (e) {
          setError(e instanceof Error ? e.message : "移動失敗");
        }
      }
      if (piece?.player === state.currentPlayer) {
        setSelected({ row, col });
      } else {
        setSelected(null);
      }
      return;
    }

    if (piece?.player === state.currentPlayer) setSelected({ row, col });
  }

  function reset() {
    setState(session.reset());
    setSelected(null);
    setError("");
  }

  function undo() {
    setState(session.undo());
    setSelected(null);
    setError("");
  }

  return (
    <section className="game-layout">
      <div className="board-panel">
        <div className="status-row">
          <span>輪到：<strong>{state.currentPlayer === "red" ? "紅方" : "黑方"}</strong></span>
          {isInCheck(state, state.currentPlayer) && <span className="check">將軍</span>}
          {engine.isGameOver(state) && <span className="gameover">遊戲結束</span>}
        </div>

        <div className="xiangqi-board" data-testid="xiangqi-board">
          {state.board.map((row, r) =>
            row.map((piece, c) => {
              const isSelected = selected?.row === r && selected?.col === c;
              const isTarget = targets.some(m => m.to.row === r && m.to.col === c);
              return (
                <button
                  key={`${r}-${c}`}
                  className={`cell ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""}`}
                  onClick={() => clickCell(r, c)}
                  aria-label={`${r}-${c}${piece ? ` ${labels[piece.type]}` : ""}`}
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
        <h2>中國象棋</h2>
        <p>第一個 Game Engine：XiangqiEngine</p>
        <p className="muted">規則層與 React UI 分離，可在此架構上加入暗棋、五子棋、跳棋。</p>
        <div className="actions">
          <button onClick={undo}>悔棋</button>
          <button onClick={reset}>重新開始</button>
        </div>
        {error && <div className="error">{error}</div>}
        <div className="legend">
          <div>🟥 紅方</div>
          <div>⬛ 黑方</div>
          <div>● 可移動位置</div>
        </div>
      </aside>
    </section>
  );
}