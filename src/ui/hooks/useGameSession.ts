import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GameSession } from "../../core/game/session";
import type { GameEngine, GameViewContext, Player, Position } from "../../core/game/types";
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
import {
  clearAutosave,
  readAutosave,
  writeAutosave,
  type AutosaveUi,
} from "../../core/persistence/autosave";

/**
 * 模組層級常數：若每次 render 都新建這個物件，下面 useMemo 的依賴陣列
 * 會每次都變，projectView 等於沒有被 memo 保護。
 */
const DEFAULT_VIEW_CONTEXT: GameViewContext = { role: "spectator", player: null };

export interface UseGameSessionOptions<State, Move, ViewState = State> {
  /**
   * AI 收到的是「投影後的 view」（ViewState），不是權威完整狀態——
   * 這是決策邊界上的隱藏資訊防線：暗棋的完整狀態含每顆蓋著的子的真實身分。
   * 象棋與五子棋是完全資訊，view 與 state 等價。
   */
  readonly aiPlayer?: AiPlayer<ViewState, Move>;
  readonly aiColor?: Player;
  readonly aiDelayMs?: number;
  readonly formatMove?: (move: Move, stateBefore: State) => string;
  readonly viewContext?: GameViewContext;
  /**
   * 一步棋牽涉到哪些格子（象棋：起點與終點；五子棋：落子格；暗棋：翻的格或起訖兩格）。
   * 給了才會有 lastMoveCells；Move 的形狀是各棋種自己的事，hook 不猜。
   * 請傳模組層級的穩定函式（內部以它為 memo 依賴）。
   */
  readonly moveCells?: (move: Move) => readonly Position[];
  /**
   * 開啟自動存檔：掛載時還原該棋種的自動存檔，之後每次局面改變就寫回；
   * 對局結束、棋譜被清空（重新開始 / 悔棋到起點）時清除。預設關閉。
   * 棋局之外的 UI 選項（對戰模式 / 執方 / AI 風格 / 規則模式）由 autosaveUi 帶進同一份存檔，
   * 還原時由棋盤自己用 readAutosaveUi 讀回（見 ui/saved-ui.ts）。
   */
  readonly autosave?: boolean;
  /**
   * 傳函式時以「目前實際局面」計算（例：五子棋的規則模式要以局面實際生效的為準，
   * 載入存檔後可能與本地 state 不同）。
   */
  readonly autosaveUi?: AutosaveUi | ((state: State) => AutosaveUi);
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
  const viewContext: GameViewContext = options?.viewContext ?? DEFAULT_VIEW_CONTEXT;

  const viewState: ViewState = useMemo(() => {
    if (isReplayMode && replaySession) {
      return replaySession.viewAt(replayStep, viewContext);
    }
    return engine.projectView(activeState, viewContext);
  }, [engine, activeState, viewContext, isReplayMode, replaySession, replayStep]);

  // 「當前有效步」的棋譜：復盤時是截到 replayStep 的切片，否則是整局。
  // history 與 lastMoveCells 共用這一份，兩者永遠對齊同一步。
  const history = isReplayMode
    ? (replaySession ? session.getHistory().slice(0, replayStep) : [])
    : session.getHistory();
  const lastMove: Move | undefined =
    history.length > 0 ? history[history.length - 1].move : undefined;
  const moveCells = options?.moveCells;
  /** 當前有效步所牽涉格子的 "row,col" 集合；0 步或沒給 moveCells 時為空集合。 */
  const lastMoveCells: ReadonlySet<string> = useMemo(() => {
    const set = new Set<string>();
    if (lastMove !== undefined && moveCells) {
      for (const p of moveCells(lastMove)) set.add(`${p.row},${p.col}`);
    }
    return set;
  }, [lastMove, moveCells]);

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

  // ---------- 自動存檔 ----------
  const autosaveEnabled = options?.autosave ?? false;

  // 只在掛載時還原一次（不是每次 engine/session 重建都還原：五子棋切換規則會重建
  // session，那是「開新局」，不該把舊局倒回來）。useLayoutEffect 讓還原後的盤面
  // 在第一次繪製前就位，不會閃一下空棋盤。還原失敗（壞檔 / 格式不符）時
  // SaveManager.load 保證不動 live session，這裡再把壞檔清掉，避免首頁一直顯示「繼續」。
  useLayoutEffect(() => {
    if (!autosaveEnabled) return;
    const raw = readAutosave(engine.id);
    if (!raw) return;
    try {
      saveManager.load(raw, session, engine);
      setState(session.getState());
    } catch {
      clearAutosave(engine.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 局面每次改變後同步自動存檔。直接讀 session 而非 React state：
  // 五子棋切換規則時 session 會被重建，session 才是權威來源。
  const sessionState = session.getState();
  const autosaveUiOption = options?.autosaveUi;
  const autosaveUi =
    typeof autosaveUiOption === "function"
      ? autosaveUiOption(sessionState)
      : autosaveUiOption;
  // 以內容（而非物件參照）判斷 UI 設定是否改變，呼叫端不必替它 memo
  const autosaveUiKey = autosaveUi ? JSON.stringify(autosaveUi) : "";
  useEffect(() => {
    if (!autosaveEnabled) return;
    if (session.getHistory().length === 0 || engine.isGameOver(session.getState())) {
      clearAutosave(engine.id);
      return;
    }
    try {
      writeAutosave(engine.id, saveManager.save(session, engine), autosaveUi);
    } catch {
      clearAutosave(engine.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveEnabled, engine, session, saveManager, state, sessionState, autosaveUiKey]);

  // 「對局進行中」：有棋譜、且「實際對局」（不是復盤畫面）尚未結束。
  // 對局結束時自動存檔會被刻意清掉，此時沒有任何東西需要保存；
  // 必須讀 live 的 state 而不是 isGameOver（後者在復盤時跟著復盤步數走，
  // 復盤一局已結束的棋、停在前幾步時會是 false），也不能用 history（復盤時被截斷）。
  const inProgress = session.getHistory().length > 0 && !engine.isGameOver(session.getState());

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
          const aiView = engine.projectView(stateRef.current, {
            role: "player",
            player: aiColor,
          });
          const chosenMove = await aiPlayer.selectMove(
            aiView,
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
    engine,
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
    inProgress,
    history,
    lastMoveCells,
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
