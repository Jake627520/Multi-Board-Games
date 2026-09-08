import { useMemo, useState } from "react";
import { createBanqiEngine } from "../../games/banqi/engine";
import { useGameSession } from "../hooks/useGameSession";
import { StatusBar } from "./StatusBar";
import { MoveHistory } from "./MoveHistory";
import { ReplayControls } from "./ReplayControls";
import { SaveManagerPanel } from "./SaveManagerPanel";
import { GameModeSelector, type GameMode } from "./GameModeSelector";
import { createBanqiAiLevel1, createBanqiAiLevel2 } from "../../games/banqi/ai";
import type { BanqiMove, BanqiPlayer, BanqiState, BanqiViewState } from "../../games/banqi/types";
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

const AVAILABLE_PLAYERS = [
  { id: "red", label: "先手 (玩家先翻)" },
  { id: "black", label: "後手 (電腦先翻)" },
];

export function BanqiBoard() {
  const engine = useMemo(() => createBanqiEngine(), []);

  const [mode, setMode] = useState<GameMode>("pvp");
  const [humanPlayer, setHumanPlayer] = useState<Player>("red");
  const [aiLevel, setAiLevel] = useState<"l1" | "l2">("l1");
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

  const {
    viewState,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    legalMoves,
    error,
    history,
    move,
    undo,
    reset,
    isAiThinking,
    // Replay
    isReplayMode,
    replayStep,
    replayStepCount,
    isPlaying,
    replaySpeed,
    setReplaySpeed,
    setIsPlaying,
    enterReplay,
    exitReplay,
    replayStepTo,
    replayNext,
    replayPrev,
    // Local Save
    listLocalSaves,
    saveToLocal,
    loadFromLocal,
    deleteLocalSave,
    renameLocalSave,
  } = useGameSession<BanqiState, BanqiMove, BanqiViewState>(engine, {
    aiPlayer: mode === "pve" ? aiPlayer : undefined,
    aiColor,
    formatMove: (m) =>
      m.type === "flip"
        ? `翻 (${m.pos.row},${m.pos.col})`
        : `(${m.from.row},${m.from.col})→(${m.to.row},${m.to.col})`,
  });

  // 同步首翻決定的執色
  if (viewState.player1Color !== establishedP1Color) {
    setEstablishedP1Color(viewState.player1Color);
  }

  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  const targets = selected && !isReplayMode
    ? legalMoves
        .filter(
          (m): m is { type: "move"; from: { row: number; col: number }; to: { row: number; col: number } } =>
            m.type === "move" && m.from.row === selected.row && m.from.col === selected.col
        )
        .map((m) => m.to)
    : [];

  function handleModeChange(newMode: GameMode) {
    setMode(newMode);
    reset();
    setSelected(null);
    setEstablishedP1Color(null);
  }

  function handleHumanPlayerChange(player: Player) {
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

  function handleReset() {
    reset();
    setSelected(null);
    setEstablishedP1Color(null);
  }

  function handleUndo() {
    undo();
    setSelected(null);
  }

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

              return (
                <button
                  key={`${r}-${c}`}
                  className={`banqi-cell ${isSelected ? "selected" : ""} ${isTarget ? "target" : ""}`}
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

      <aside className="side-panel">
        <h2>暗棋 (Banqi)</h2>
        <p className="engine-badge">Engine: BanqiEngine (4×8 半盤)</p>

        {isReplayMode ? (
          <ReplayControls
            currentStep={replayStep}
            totalSteps={replayStepCount}
            isPlaying={isPlaying}
            speed={replaySpeed}
            onPrev={replayPrev}
            onNext={replayNext}
            onStepTo={replayStepTo}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSpeedChange={setReplaySpeed}
            onExit={exitReplay}
          />
        ) : (
          <>
            <div className="actions">
              <button
                type="button"
                onClick={() => enterReplay()}
                disabled={history.length === 0}
                data-testid="enter-replay-btn"
              >
                🎬 復盤回放本局
              </button>
            </div>

            <GameModeSelector
              mode={mode}
              humanPlayer={humanPlayer}
              availablePlayers={AVAILABLE_PLAYERS}
              onModeChange={handleModeChange}
              onHumanPlayerChange={handleHumanPlayerChange}
              disabled={isAiThinking}
            />

            {/* AI 難度選擇 */}
            {mode === "pve" && (
              <div className="game-mode-selector" data-testid="ai-level-selector">
                <span className="side-label">電腦難度：</span>
                <div className="mode-tabs">
                  <button
                    type="button"
                    className={`mode-btn ${aiLevel === "l1" ? "active" : ""}`}
                    onClick={() => {
                      setAiLevel("l1");
                      reset();
                      setSelected(null);
                      setEstablishedP1Color(null);
                    }}
                    disabled={isAiThinking}
                    data-testid="ai-level-1"
                  >
                    Level 1 (啟發式)
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${aiLevel === "l2" ? "active" : ""}`}
                    onClick={() => {
                      setAiLevel("l2");
                      reset();
                      setSelected(null);
                      setEstablishedP1Color(null);
                    }}
                    disabled={isAiThinking}
                    data-testid="ai-level-2"
                  >
                    Level 2 (Minimax)
                  </button>
                </div>
              </div>
            )}
          </>
        )}

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

        <MoveHistory
          moves={history.map((h) => ({
            player: h.player,
            notation: h.notation ?? "",
          }))}
          formatPlayer={formatPlayer}
          isReplayMode={isReplayMode}
          activeStep={replayStep}
          onStepClick={replayStepTo}
        />

        {!isReplayMode && (
          <SaveManagerPanel
            listSaves={listLocalSaves}
            onSave={saveToLocal}
            onLoad={loadFromLocal}
            onDelete={deleteLocalSave}
            onRename={renameLocalSave}
          />
        )}

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
