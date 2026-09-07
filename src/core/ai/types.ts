export interface AiPlayer<State, Move> {
  readonly id: string;
  readonly name: string;
  selectMove(state: State, legalMoves: Move[]): Promise<Move>;
}
