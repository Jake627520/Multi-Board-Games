import { useEffect, useMemo, useRef, useState } from "react";
import { GameSession } from "../../core/game/session";
import type { GameEngine, GameViewContext, Player } from "../../core/game/types";
import type { AiPlayer } from "../../core/ai/types";
import { SaveManager } from "../../core/persistence/save-manager";
import {
  ReplayManager,
  type ReplaySession,
} from "../../core/persistence/replay-manager";
import { exportPublicView } from "../../core/persistence/policy";
import type { GameReplayEnvelope } from "../../core/persistence/types";
import {
  listSaves,
  saveGameToStorage,
  loadSaveFromStorage,
  deleteSave,
  renameSave,
  type SaveMeta,
} from "../../core/persistence/local-storage";

export interface UseGameSessionOptions<State, Move, ViewState = State> {
  readonly aiPlayer?: AiPlayer<State, Move>;
  readonly aiColor?: Player;
  readonly aiDelayMs?: number;
  readonly formatMove?: (move: Move, stateBefore: State) => string;
  readonly viewContext?: GameViewContext;
}

export type ReplaySpeed = 400 | 800 | 1200;

export function useGameSession<State, Move, ViewState = State>(
  engine: GameEngine<State, Move, ViewState>,
  options?: UseGameSessionOptions<State, Move, ViewState>
) {
  const session = useMemo(() => new GameSession(engine), [engine]);
  const [state, setState] = useState<State>(() => session.getState());
  const [error, setError] = useState<string>("");
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // --- Replay state ---
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [replaySession, setReplaySession] =
    useState<ReplaySession<State, Move, ViewState> | null>(null);
  const [replayStep, setReplayStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(800);

  const activeState: State = isReplayMode
    ? (replaySession?.stepTo(replayStep) ?? state)
    : state;

  const currentPlayer: Player = isReplayMode
    ? engine.getCurrentPlayer(activeState)
    : session.getCurrentPlayer();

  const isGameOver: boolean = engine.isGameOver(activeState);
  const winner: Player | null = engine.getWinner(activeState);
  const legalMoves: Move[] =
    isGameOver || isReplayMode ? [] : engine.getLegalMoves(activeState);
  const isDraw: boolean = isGameOver && winner === null;

  const aiPlayer = options?.aiPlayer;
  const aiColor = options?.aiColor;
  const aiDelayMs = options?.aiDelayMs ?? 400;
  const viewContext: GameViewContext = options?.viewContext ?? {
    role: "spectator",
    player: null,
  };

  const viewState: ViewState = useMemo(() => {
    if (isReplayMode && replaySession) {
      return replaySession.viewAt(replayStep, viewContext);
    }
    return engine.projectView(activeState, viewContext);
  }, [engine, activeState, viewContext, isReplayMode, replaySession, replayStep]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const legalMovesRef = useRef(legalMoves);
  legalMovesRef.current = legalMoves;
  const isAiThinkingRef = useRef(isAiThinking);
  isAiThinkingRef.current = isAiThinking;

  const formatMove = options?.formatMove;

  // ---------- 對戰操作 ----------
  function move(m: Move): boolean {
    if (isReplayMode || isAiThinkingRef.current) return false;
    setError("");
    try {
      const notation = formatMove ? formatMove(m, state) : undefined;
      const nextState = session.move(m, notation);
      setState(nextState);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "移動失敗");
      return false;
    }
  }

  function undo(): void {
    if (isReplayMode || isAiThinkingRef.current) return;
    setError("");
    setIsAiThinking(false);

    if (!aiColor || !aiPlayer) {
      // PvP 模式：保持嚴格單步回退，完全不改變 PvP 行為
      setState(session.undo());
      return;
    }

    // PvE 模式：回退至上一個「人類玩家可決策點（Human decision point）」
    if (session.getHistory().length === 0) return;

    let nextState = session.undo();
    while (
      session.getHistory().length > 0 &&
      engine.getCurrentPlayer(nextState) === aiColor
    ) {
      nextState = session.undo();
    }

    setState(nextState);
  }

  function reset(): void {
    setError("");
    setIsAiThinking(false);
    exitReplay();
    setState(session.reset());
  }

  // ---------- Save / Load ----------
  const saveManager = useMemo(() => new SaveManager(), []);
  const replayManager = useMemo(() => new ReplayManager(), []);

  function saveGame(): string {
    return saveManager.save(session, engine);
  }

  function loadGame(envelopeJson: string): boolean {
    if (isAiThinkingRef.current) return false;
    setError("");
    try {
      exitReplay();
      saveManager.load(envelopeJson, session, engine);
      setState(session.getState());
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "讀取存檔失敗";
      setError(msg);
      return false;
    }
  }

  function exportPublic(ctx?: GameViewContext): string {
    return exportPublicView(session, engine, ctx ?? viewContext);
  }

  function createReplay(): GameReplayEnvelope<Move> {
    return replayManager.createReplay(session, engine);
  }

  // ---------- Local Storage 存檔列表 ----------
  function listLocalSaves(): SaveMeta[] {
    return listSaves(engine.id);
  }

  function saveToLocal(name?: string): SaveMeta {
    const data = saveGame();
    return saveGameToStorage(
      engine.id,
      name ?? `存檔 ${new Date().toLocaleString()}`,
      data,
      session.getHistory().length
    );
  }

  function loadFromLocal(id: string): boolean {
    const meta = loadSaveFromStorage(id);
    if (!meta) {
      setError("找不到指定存檔");
      return false;
    }
    return loadGame(meta.data);
  }

  function deleteLocalSave(id: string): void {
    deleteSave(id);
  }

  function renameLocalSave(id: string, newName: string): SaveMeta | null {
    return renameSave(id, newName);
  }

  // ---------- Replay 控制 ----------
  function enterReplay(envelope?: GameReplayEnvelope<Move>): void {
    setIsAiThinking(false);
    setIsPlaying(false);
    try {
      const env = envelope ?? createReplay();
      const rs = replayManager.loadReplay(env, engine);
      setReplaySession(rs);
      setReplayStep(0);
      setIsReplayMode(true);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法進入回放");
    }
  }

  function exitReplay(): void {
    setIsPlaying(false);
    setIsReplayMode(false);
    setReplaySession(null);
    setReplayStep(0);
  }

  function replayStepTo(step: number): void {
    if (!replaySession) return;
    const max = replaySession.getStepCount();
    const clamped = Math.max(0, Math.min(step, max));
    setReplayStep(clamped);
  }

  function replayNext(): void {
    if (!replaySession) return;
    replayStepTo(replayStep + 1);
  }

  function replayPrev(): void {
    if (!replaySession) return;
    replayStepTo(replayStep - 1);
  }

  // 自動播放
  useEffect(() => {
    if (!isReplayMode || !isPlaying || !replaySession) return;
    if (replayStep >= replaySession.getStepCount()) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      replayStepTo(replayStep + 1);
    }, replaySpeed);
    return () => clearTimeout(timer);
  }, [isReplayMode, isPlaying, replayStep, replaySpeed, replaySession]);

  // AI（回放模式強制關閉）
  useEffect(() => {
    if (isReplayMode || !aiPlayer || !aiColor || isGameOver) return;
    if (currentPlayer === aiColor) {
      setIsAiThinking(true);
      let cancelled = false;
      const timer = setTimeout(async () => {
        try {
          const chosenMove = await aiPlayer.selectMove(
            stateRef.current,
            legalMovesRef.current
          );
          if (cancelled) return;
          const notation = formatMove
            ? formatMove(chosenMove, stateRef.current)
            : undefined;
          const nextState = session.move(chosenMove, notation);
          setState(nextState);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "AI 走步失敗");
          }
        } finally {
          if (!cancelled) {
            setIsAiThinking(false);
          }
        }
      }, aiDelayMs);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, [
    currentPlayer,
    aiColor,
    aiPlayer,
    isGameOver,
    session,
    aiDelayMs,
    formatMove,
    isReplayMode,
  ]);

  return {
    // 既有
    state: activeState,
    viewState,
    session,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    legalMoves,
    error,
    isAiThinking,
    history: isReplayMode
      ? (replaySession
          ? session.getHistory().slice(0, replayStep)
          : [])
      : session.getHistory(),
    move,
    undo,
    reset,
    saveGame,
    loadGame,
    exportPublic,
    createReplay,

    // 本機存檔
    listLocalSaves,
    saveToLocal,
    loadFromLocal,
    deleteLocalSave,
    renameLocalSave,

    // Replay
    isReplayMode,
    replayStep,
    replayStepCount: replaySession?.getStepCount() ?? 0,
    isPlaying,
    replaySpeed,
    setReplaySpeed,
    setIsPlaying,
    enterReplay,
    exitReplay,
    replayStepTo,
    replayNext,
    replayPrev,
  };
}
