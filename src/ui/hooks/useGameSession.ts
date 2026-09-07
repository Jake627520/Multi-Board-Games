import { useEffect, useMemo, useRef, useState } from "react";
import { GameSession } from "../../core/game/session";
import type { GameEngine, Player } from "../../core/game/types";
import type { AiPlayer } from "../../core/ai/types";

export interface UseGameSessionOptions<State, Move> {
  readonly aiPlayer?: AiPlayer<State, Move>;
  readonly aiColor?: Player;
  readonly aiDelayMs?: number;
}

export function useGameSession<State, Move>(
  engine: GameEngine<State, Move>,
  options?: UseGameSessionOptions<State, Move>
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

  // Track latest references to avoid stale closures in setTimeout
  const stateRef = useRef(state);
  stateRef.current = state;
  const legalMovesRef = useRef(legalMoves);
  legalMovesRef.current = legalMoves;
  const isAiThinkingRef = useRef(isAiThinking);
  isAiThinkingRef.current = isAiThinking;

  function move(m: Move): boolean {
    if (isAiThinkingRef.current) return false;
    setError("");
    try {
      const nextState = session.move(m);
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
          const nextState = session.move(chosenMove);
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
  }, [currentPlayer, aiColor, aiPlayer, isGameOver, session, aiDelayMs]);

  return {
    state,
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
  };
}
