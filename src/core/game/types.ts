export type Player = string;
export type GameId = string;

export interface Position {
  readonly row: number;
  readonly col: number;
}

export interface MoveRecord<Move = unknown> {
  readonly move: Move;
  readonly player: Player;
  readonly notation?: string;
}

export type ViewRole = "player" | "spectator";

export interface GameViewContext<P = Player> {
  readonly role: ViewRole;
  readonly player: P | null;
}

export interface GameEngine<State, Move, ViewState = State> {
  readonly id: GameId;
  readonly name: string;
  createInitialState(): State;
  getCurrentPlayer(state: State): Player;
  getLegalMoves(state: State): Move[];
  applyMove(state: State, move: Move): State;
  isGameOver(state: State): boolean;
  getWinner(state: State): Player | null;
  serialize(state: State): string;
  deserialize(serialized: string): State;
  projectView(state: State, context: GameViewContext): ViewState;
  serializeView(viewState: ViewState): string;
}

export type { AiPlayer } from "../ai/types";