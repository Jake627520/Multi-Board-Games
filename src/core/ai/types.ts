/**
 * AI 玩家。`Observation` 是 AI「看得到的東西」，不一定等於權威狀態：
 * 完全資訊遊戲（象棋、五子棋）兩者等價；暗棋則必須是投影後的 view，
 * 不得含蓋著棋子的真實身分（見 useGameSession 與 banqi/ai.ts）。
 */
export interface AiPlayer<Observation, Move> {
  readonly id: string;
  readonly name: string;
  selectMove(observation: Observation, legalMoves: Move[]): Promise<Move>;
}
