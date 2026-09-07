import { useMemo, useState } from "react";
import { createGomokuEngine } from "../../games/gomoku/engine";
import { createGomokuAiLevel1 } from "../../games/gomoku/ai";
import { toGomokuNotation } from "../../games/gomoku/notation";
import { useGameSession } from "../hooks/useGameSession";
import { StatusBar } from "./StatusBar";
import { GameModeSelector, type GameMode } from "./GameModeSelector";
import { MoveHistory } from "./MoveHistory";
import type { GomokuMove, GomokuPlayer, GomokuState } from "../../games/gomoku/types";
import type { Player } from "../../core/game/types";

const AVAILABLE_PLAYERS = [
  { id: "black", label: "⚫ 黑子（先手）" },
  { id: "white", label: "⚪ 白子（後手）" },
];

export function GomokuBoard() {
  const engine = useMemo(() => createGomokuEngine(), []);
  const aiPlayer = useMemo(() => createGomokuAiLevel1(), []);

  const [mode, setMode] = useState<GameMode>("pvp");
  const [humanPlayer, setHumanPlayer] = useState<Player>("black");

  const aiColor: Player | undefined =
    mode === "pve" ? (humanPlayer === "black" ? "white" : "black") : undefined;

  const {
    state,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    error,
    isAiThinking,
    history,
    move,
    undo,
    reset,
  } = useGameSession<GomokuState, GomokuMove>(engine, {
    aiPlayer: mode === "pve" ? aiPlayer : undefined,
    aiColor,
    formatMove: (m) => toGomokuNotation(m),
  });

  function handleCellClick(row: number, col: number) {
    if (isGameOver || isAiThinking || state.board[row][col] !== null) return;
    if (mode === "pve" && currentPlayer !== humanPlayer) return;
    move({ row, col });
  }

  function handleModeChange(newMode: GameMode) {
    setMode(newMode);
    reset();
  }

  function handleHumanPlayerChange(p: Player) {
    setHumanPlayer(p);
    reset();
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
          isAiThinking={isAiThinking}
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
                  disabled={isGameOver || isAiThinking || !isEmpty}
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
