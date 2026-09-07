import { useMemo, useState } from "react";
import { GameSession } from "../../core/game/session";
import type { GameEngine, Player } from "../../core/game/types";

export function useGameSession<State, Move>(engine: GameEngine<State, Move>) {
  const session = useMemo(() => new GameSession(engine), [engine]);
  const [state, setState] = useState<State>(() => session.getState());
  const [error, setError] = useState<string>("");

  const currentPlayer: Player = session.getCurrentPlayer();
  const isGameOver: boolean = engine.isGameOver(state);
  const winner: Player | null = engine.getWinner(state);
  const legalMoves: Move[] = isGameOver ? [] : engine.getLegalMoves(state);
  const isDraw: boolean = isGameOver && winner === null;

  function move(m: Move): boolean {
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
    setError("");
    const prev = session.undo();
    setState(prev);
  }

  function reset(): void {
    setError("");
    const initial = session.reset();
    setState(initial);
  }

  return {
    state,
    session,
    currentPlayer,
    isGameOver,
    winner,
    isDraw,
    legalMoves,
    error,
    history: session.getHistory(),
    move,
    undo,
    reset,
  };
}
