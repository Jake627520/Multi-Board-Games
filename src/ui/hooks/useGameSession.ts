import { useEffect, useMemo, useRef, useState } from "react";
import { GameSession } from "../../core/game/session";
import type { GameEngine, GameViewContext, Player } from "../../core/game/types";
import type { AiPlayer } from "../../core/ai/types";
import { SaveManager } from "../../core/persistence/save-manager";
import { ReplayManager } from "../../core/persistence/replay-manager";
import { exportPublicView } from "../../core/persistence/policy";
import type { GameReplayEnvelope } from "../../core/persistence/types";

export interface UseGameSessionOptions<State, Move, ViewState = State> {
  readonly aiPlayer?: AiPlayer<State, Move>;
  readonly aiColor?: Player;
  readonly aiDelayMs?: number;
  readonly formatMove?: (move: Move, stateBefore: State) => string;
  readonly viewContext?: GameViewContext;
}

export function useGameSession<State, Move, ViewState = State>(
  engine: GameEngine<State, Move, ViewState>,
  options?: UseGameSessionOptions<State, Move, ViewState>
) {
  const session = useMemo(() => new GameSession(engine), [engine]);
  const [state, setState] = useState<State>(() => session.getState());
  const [error, setError] = useState<string>("");
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  const currentPlayer: Player = session.getCurrentPlayer();
  const isGameOver: boolean = engine.isGameOver(state);
  const winner: Player | null = engine.getWinner(state);
  const legalMoves: Move[] = isGameOver ? [] : engine.getLegalMoves(state);
  const isDraw: boolean = isGameOver && winner === null;

  const aiPlayer = options?.aiPlayer;
  const aiColor = options?.aiColor;
  const aiDelayMs = options?.aiDelayMs ?? 400;
  const viewContext: GameViewContext = options?.viewContext ?? {
    role: "spectator",
    player: null,
  };

  // Safe projected view state for UI consumption
  const viewState: ViewState = useMemo(
    () => engine.projectView(state, viewContext),
    [engine, state, viewContext]
  );

  // Track latest references to avoid stale closures in setTimeout
  const stateRef = useRef(state);
  stateRef.current = state;
  const legalMovesRef = useRef(legalMoves);
  legalMovesRef.current = legalMoves;
  const isAiThinkingRef = useRef(isAiThinking);
  isAiThinkingRef.current = isAiThinking;

  const formatMove = options?.formatMove;

  function move(m: Move): boolean {
    if (isAiThinkingRef.current) return false;
    setError("");
    try {
      const notation = formatMove ? formatMove(m, state) : undefined;
      const nextState = session.move(m, notation);
      setState(nextState);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "移動失敗";
      setError(msg);
      return false;
    }
  }

  function undo(): void {
    if (isAiThinkingRef.current) return;
    setError("");
    const prev = session.undo();
    setState(prev);
  }

  function reset(): void {
    setError("");
    setIsAiThinking(false);
    const initial = session.reset();
    setState(initial);
  }

  const saveManager = useMemo(() => new SaveManager(), []);
  const replayManager = useMemo(() => new ReplayManager(), []);

  function saveGame(): string {
    return saveManager.save(session, engine);
  }

  function loadGame(envelopeJson: string): boolean {
    if (isAiThinkingRef.current) return false;
    setError("");
    try {
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

  // AI turn automation
  useEffect(() => {
    if (!aiPlayer || !aiColor || isGameOver) return;

    if (currentPlayer === aiColor) {
      setIsAiThinking(true);
      const timer = setTimeout(async () => {
        try {
          const chosenMove = await aiPlayer.selectMove(
            stateRef.current,
            legalMovesRef.current
          );
          const notation = formatMove ? formatMove(chosenMove, stateRef.current) : undefined;
          const nextState = session.move(chosenMove, notation);
          setState(nextState);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "AI 走步失敗";
          setError(msg);
        } finally {
          setIsAiThinking(false);
        }
      }, aiDelayMs);

      return () => clearTimeout(timer);
    }
  }, [currentPlayer, aiColor, aiPlayer, isGameOver, session, aiDelayMs, formatMove]);

  return {
    state,
    viewState,
    session,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    legalMoves,
    error,
    isAiThinking,
    history: session.getHistory(),
    move,
    undo,
    reset,
    saveGame,
    loadGame,
    exportPublic,
    createReplay,
  };
}
