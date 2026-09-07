import type { GameEngine, MoveRecord, Player } from "./types";

export class GameSession<State, Move> {
  private state: State;
  private readonly history: MoveRecord<Move>[] = [];
  private readonly snapshots: State[] = [];

  constructor(private readonly engine: GameEngine<State, Move>) {
    this.state = engine.createInitialState();
  }

  getState(): State {
    return this.state;
  }

  getHistory(): readonly MoveRecord<Move>[] {
    return this.history;
  }

  getCurrentPlayer(): Player {
    return this.engine.getCurrentPlayer(this.state);
  }

  move(move: Move, notation?: string): State {
    const legal = this.engine.getLegalMoves(this.state);
    if (!legal.some((candidate) => JSON.stringify(candidate) === JSON.stringify(move))) {
      throw new Error("Illegal move");
    }
    this.snapshots.push(this.state);
    const player = this.engine.getCurrentPlayer(this.state);
    this.state = this.engine.applyMove(this.state, move);
    this.history.push({ move, player, notation });
    return this.state;
  }

  undo(): State {
    const previous = this.snapshots.pop();
    if (!previous) return this.state;
    this.state = previous;
    this.history.pop();
    return this.state;
  }

  reset(): State {
    this.state = this.engine.createInitialState();
    this.history.length = 0;
    this.snapshots.length = 0;
    return this.state;
  }
}