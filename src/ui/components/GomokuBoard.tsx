import { useEffect, useMemo, useState } from "react";
import { createGomokuEngine } from "../../games/gomoku/engine";
import { createGomokuAiLevel1, createGomokuAiLevel2 } from "../../games/gomoku/ai";
import { toGomokuNotation } from "../../games/gomoku/notation";
import { useGameSession } from "../hooks/useGameSession";
import { useCoarsePointer } from "../hooks/useCoarsePointer";
import { useTapConfirmPlacement } from "../hooks/useTapConfirmPlacement";
import { StatusBar } from "./StatusBar";
import { TapConfirmBar } from "./TapConfirmBar";
import { type GameMode } from "./GameModeSelector";
import { BoardSidePanel } from "./BoardSidePanel";
import type { AiLevel } from "./AiLevelSelector";
import type { GomokuMove, GomokuPlayer, GomokuRuleMode, GomokuState } from "../../games/gomoku/types";
import type { Player } from "../../core/game/types";
import type { BoardProps } from "../board-props";
import { confirmDiscardGame } from "../confirm-discard";
import { loadSavedUi } from "../saved-ui";
import { gomokuMoveCells } from "../move-cells";

const AVAILABLE_PLAYERS: { id: Player; label: string }[] = [
  { id: "black", label: "⚫ 黑子（先手）" },
  { id: "white", label: "⚪ 白子（後手）" },
];

export function GomokuBoard({ onProgressChange }: BoardProps) {
  // 自動存檔附帶的 UI 設定：只在掛載時讀一次，當作下面幾個 state 的初始值。
  // ruleMode 尤其重要：它決定「重新開始」會用哪個規則開新局，續局後若退回
  // freestyle，禁手局按重新開始會無聲變成自由規則。
  const [saved] = useState(() =>
    loadSavedUi<GomokuRuleMode>(
      "gomoku",
      AVAILABLE_PLAYERS.map((p) => p.id),
      ["freestyle", "forbidden_moves"]
    )
  );
  const [ruleMode, setRuleMode] = useState<GomokuRuleMode>(saved.ruleMode ?? "freestyle");
  const [aiLevel, setAiLevel] = useState<AiLevel>(saved.aiLevel ?? "l1");
  const [mode, setMode] = useState<GameMode>(saved.mode ?? "pvp");
  const [humanPlayer, setHumanPlayer] = useState<Player>(saved.humanPlayer ?? "black");

  const engine = useMemo(() => createGomokuEngine(ruleMode), [ruleMode]);

  /**
   * 畫面要顯示的規則模式以「實際狀態」為準，不是本地 state。
   * ruleMode 這個 state 的角色是「開新局時要用哪個模式」，而載入存檔會
   * 連同存檔裡的 ruleMode 一起還原——引擎依狀態執行禁手，本地 state 卻
   * 還停在 freestyle，於是按鈕與說明顯示自由規則、黑方下三三卻被擋。
   */
  const aiPlayer = useMemo(
    () => (aiLevel === "l2" ? createGomokuAiLevel2() : createGomokuAiLevel1()),
    [aiLevel]
  );

  const aiColor: Player | undefined =
    mode === "pve" ? (humanPlayer === "black" ? "white" : "black") : undefined;

  const session = useGameSession<GomokuState, GomokuMove>(engine, {
    aiPlayer: mode === "pve" ? aiPlayer : undefined,
    aiColor,
    formatMove: (m) => toGomokuNotation(m),
    moveCells: gomokuMoveCells,
    autosave: true,
    autosaveUi: (s) => ({ mode, humanPlayer, aiLevel, ruleMode: s.ruleMode ?? ruleMode }),
  });

  const {
    viewState,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    error,
    isAiThinking,
    move,
    undo,
    reset,
    isReplayMode,
    inProgress,
    lastMoveCells,
  } = session;

  const activeRuleMode = viewState.ruleMode ?? ruleMode;

  const winningSet = useMemo(() => {
    const set = new Set<string>();
    viewState.winningLine?.forEach((p) => set.add(`${p.row},${p.col}`));
    return set;
  }, [viewState.winningLine]);

  // 觸控裝置（手機）改成兩段式落子：第一次點格子只放預覽子，按確認列的
  // 大按鈕才真的提交。滑鼠／鍵盤（isTouch === false）維持點一下直接落子。
  const isTouch = useCoarsePointer();
  const canPlace = () =>
    !isGameOver && !isAiThinking && !isReplayMode && (mode !== "pve" || currentPlayer === humanPlayer);
  const tapConfirm = useTapConfirmPlacement<{ row: number; col: number }>({
    enabled: isTouch,
    onCommit: (coord) => move(coord),
    canAct: canPlace,
  });

  function handleCellClick(row: number, col: number) {
    if (isGameOver || isAiThinking || isReplayMode || viewState.board[row][col] !== null) return;
    if (mode === "pve" && currentPlayer !== humanPlayer) return;
    tapConfirm.selectCell({ row, col });
  }

  // 復盤模式的進出由 BoardSidePanel/ReplayControls 深層觸發，這裡用 effect 攔截，
  // 避免復盤中殘留一顆看似可提交的預覽子。
  useEffect(() => {
    tapConfirm.cancelPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReplayMode]);

  function handleReset() {
    if (isReplayMode) return; // 復盤中不可重新開始（按鈕也已停用）
    if (!confirmDiscardGame(inProgress, "重新開始")) return;
    tapConfirm.cancelPending();
    reset();
  }

  function handleUndo() {
    tapConfirm.cancelPending();
    undo();
  }

  function handleModeChange(newMode: GameMode) {
    // 點已經選中的模式不是切換：不能清局
    if (newMode === mode) return;
    if (!confirmDiscardGame(inProgress, "切換對戰模式")) return;
    tapConfirm.cancelPending();
    setMode(newMode);
    reset();
  }

  function handleHumanPlayerChange(p: Player) {
    if (p === humanPlayer) return;
    if (!confirmDiscardGame(inProgress, "更換執方")) return;
    tapConfirm.cancelPending();
    setHumanPlayer(p);
    reset();
  }

  function handleRuleModeChange(newRuleMode: GomokuRuleMode) {
    // 以畫面實際生效的規則比對（載入存檔後與本地 state 可能不同）
    if (newRuleMode === activeRuleMode) return;
    if (!confirmDiscardGame(inProgress, "更換規則模式")) return;
    tapConfirm.cancelPending();
    setRuleMode(newRuleMode);
    reset();
  }

  // 回報「本局是否已開始」給 App（切換遊戲 / 回首頁前的確認依據）
  // 排除已結束的對局：結束時自動存檔已被清掉，沒有東西需要保存，不該再警告
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
          onUndo={handleUndo}
          onReset={handleReset}
          isReplayMode={isReplayMode}
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
              const isLastMove = lastMoveCells.has(`${r},${c}`);
              const isPreview =
                tapConfirm.pending !== null &&
                tapConfirm.pending.row === r &&
                tapConfirm.pending.col === c;
              return (
                <button
                  key={`${r}-${c}`}
                  className={`gomoku-cell ${isEmpty ? "empty" : ""} ${isLastMove ? "last-move" : ""}`}
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
                  {!stone && isPreview && (
                    <span
                      className={`stone ${currentPlayer} preview`}
                      data-testid="stone-preview"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>

        {tapConfirm.pending && (
          <TapConfirmBar
            label={`${formatPlayer(currentPlayer)} → ${toGomokuNotation(tapConfirm.pending)}`}
            onConfirm={tapConfirm.confirmPending}
            onCancel={tapConfirm.cancelPending}
          />
        )}
      </div>

      <BoardSidePanel
        session={session}
        latinName={engine.latinName}
        name={engine.name}
        badge="15 × 15 棋盤"
        mode={mode}
        humanPlayer={humanPlayer}
        availablePlayers={AVAILABLE_PLAYERS}
        onModeChange={handleModeChange}
        onHumanPlayerChange={handleHumanPlayerChange}
        aiLevel={aiLevel}
        onAiLevelChange={setAiLevel}
        formatPlayer={formatPlayer}
        disabled={isAiThinking}
        extraControls={
          /* 規則模式選擇 */
          <div className="game-mode-selector" data-testid="rule-mode-selector">
            <span className="side-label">規則模式：</span>
            <div className="mode-tabs">
              <button
                type="button"
                className={`mode-btn ${activeRuleMode === "freestyle" ? "active" : ""}`}
                onClick={() => handleRuleModeChange("freestyle")}
                disabled={isAiThinking}
                data-testid="rule-freestyle"
              >
                自由規則 (Freestyle)
              </button>
              <button
                type="button"
                className={`mode-btn ${activeRuleMode === "forbidden_moves" ? "active" : ""}`}
                onClick={() => handleRuleModeChange("forbidden_moves")}
                disabled={isAiThinking}
                data-testid="rule-forbidden"
              >
                黑方禁手 (Forbidden)
              </button>
            </div>
          </div>
        }
      >
        <div className="muted">
          <p>
            {activeRuleMode === "freestyle" ? (
              <>
                <strong>五子棋 Free-style 規則 (Rules)</strong>：
                <br />
                黑方先行，先在橫、直、斜任一方向連成五子者獲勝。
                <span className="en-rule">Black moves first. The first player to align five stones horizontally, vertically, or diagonally wins.</span>
              </>
            ) : (
              <>
                <strong>五子棋 黑方禁手規則 (Forbidden Moves for Black)</strong>：
                <br />
                黑方先行，禁止三三、四四與長連（≥6）；成五優先勝。白方無禁手限制。
                <span className="en-rule">Black plays first with forbidden moves (double-three, double-four, overline ≥6). Five-in-a-row wins immediately. White has no restrictions.</span>
              </>
            )}
          </p>
        </div>

        <div className="legend">
          <div>⚫ 黑子 (Black)：先行方 (First)</div>
          <div>⚪ 白子 (White)：後行方 (Second)</div>
          <div>🏆 5 連珠即勝 (5-in-a-row wins)</div>
        </div>
      </BoardSidePanel>
    </section>
  );
}
