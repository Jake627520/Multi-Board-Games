import { useEffect, useMemo, useState } from "react";
import { createGomokuEngine } from "../../games/gomoku/engine";
import { createGomokuAiLevel1, createGomokuAiLevel2 } from "../../games/gomoku/ai";
import { toGomokuNotation } from "../../games/gomoku/notation";
import { useGameSession } from "../hooks/useGameSession";
import { StatusBar } from "./StatusBar";
import { GameModeSelector, type GameMode } from "./GameModeSelector";
import { MoveHistory } from "./MoveHistory";
import { ReplayControls } from "./ReplayControls";
import { SaveManagerPanel } from "./SaveManagerPanel";
import type { GomokuMove, GomokuPlayer, GomokuRuleMode, GomokuState } from "../../games/gomoku/types";
import type { Player } from "../../core/game/types";
import type { BoardProps } from "../board-props";

const AVAILABLE_PLAYERS = [
  { id: "black", label: "⚫ 黑子（先手）" },
  { id: "white", label: "⚪ 白子（後手）" },
];

export function GomokuBoard({ onProgressChange }: BoardProps) {
  const [ruleMode, setRuleMode] = useState<GomokuRuleMode>("freestyle");
  const [aiLevel, setAiLevel] = useState<"l1" | "l2">("l1");
  const [mode, setMode] = useState<GameMode>("pvp");
  const [humanPlayer, setHumanPlayer] = useState<Player>("black");

  const engine = useMemo(() => createGomokuEngine(ruleMode), [ruleMode]);
  const aiPlayer = useMemo(
    () => (aiLevel === "l2" ? createGomokuAiLevel2() : createGomokuAiLevel1()),
    [aiLevel]
  );

  const aiColor: Player | undefined =
    mode === "pve" ? (humanPlayer === "black" ? "white" : "black") : undefined;

  const {
    viewState,
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
  } = useGameSession<GomokuState, GomokuMove>(engine, {
    aiPlayer: mode === "pve" ? aiPlayer : undefined,
    aiColor,
    formatMove: (m) => toGomokuNotation(m),
  });

  const winningSet = useMemo(() => {
    const set = new Set<string>();
    viewState.winningLine?.forEach((p) => set.add(`${p.row},${p.col}`));
    return set;
  }, [viewState.winningLine]);

  function handleCellClick(row: number, col: number) {
    if (isGameOver || isAiThinking || isReplayMode || viewState.board[row][col] !== null) return;
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

  function handleRuleModeChange(newRuleMode: GomokuRuleMode) {
    setRuleMode(newRuleMode);
    reset();
  }

  // 回報「本局是否已開始」給 App（切換遊戲 / 回首頁前的確認依據）
  const inProgress = history.length > 0 || isReplayMode;
  useEffect(() => {
    onProgressChange?.(inProgress);
  }, [inProgress, onProgressChange]);

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
          {viewState.board.map((row, r) =>
            row.map((stone: GomokuPlayer | null, c: number) => {
              const isEmpty = stone === null;
              const isWinning = winningSet.has(`${r},${c}`);
              return (
                <button
                  key={`${r}-${c}`}
                  className={`gomoku-cell ${isEmpty ? "empty" : ""}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={isGameOver || isAiThinking || isReplayMode || !isEmpty}
                  aria-label={`${r}-${c}${stone ? ` ${stone}` : " 空位"}`}
                >
                  {stone && (
                    <span
                      className={`stone ${stone} ${isWinning ? "winning" : ""}`}
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
        {engine.latinName && (
          <span className="latin-name">{engine.latinName}</span>
        )}
        <h2>{engine.name}</h2>
        <p className="engine-badge">15 × 15 棋盤</p>

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

            {/* 規則模式選擇 */}
            <div className="game-mode-selector" data-testid="rule-mode-selector">
              <span className="side-label">規則模式：</span>
              <div className="mode-tabs">
                <button
                  type="button"
                  className={`mode-btn ${ruleMode === "freestyle" ? "active" : ""}`}
                  onClick={() => handleRuleModeChange("freestyle")}
                  disabled={isAiThinking}
                  data-testid="rule-freestyle"
                >
                  自由規則 (Freestyle)
                </button>
                <button
                  type="button"
                  className={`mode-btn ${ruleMode === "forbidden_moves" ? "active" : ""}`}
                  onClick={() => handleRuleModeChange("forbidden_moves")}
                  disabled={isAiThinking}
                  data-testid="rule-forbidden"
                >
                  黑方禁手 (Forbidden)
                </button>
              </div>
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
                    onClick={() => setAiLevel("l1")}
                    disabled={isAiThinking}
                    data-testid="ai-level-1"
                  >
                    Level 1 (啟發式)
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${aiLevel === "l2" ? "active" : ""}`}
                    onClick={() => setAiLevel("l2")}
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
            disabled={isAiThinking}
          />
        )}

        <p className="muted">
          {ruleMode === "freestyle"
            ? "五子棋 Free-style 規則：黑方先行，先在橫、直、斜任一方向連成五子者獲勝。"
            : "五子棋 禁手規則：黑方先行，禁止三三、四四與長連（≥6）；成五優先勝。白方無禁手限制。"}
        </p>

        <div className="legend">
          <div>⚫ 黑子：先行方</div>
          <div>⚪ 白子：後行方</div>
          <div>🏆 5 連珠即勝（高亮金光顯示）</div>
        </div>
      </aside>
    </section>
  );
}
