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

/**
 * 首頁卡片的識別色，只允許對應 styles.css `:root` 已存在的 token
 * （--accent 朱砂 / --ink 墨 / --jade 玉 / --gold 金），不得新增顏色值。
 */
export type GameAccent = "accent" | "ink" | "jade" | "gold";

/**
 * 展示用 metadata：供首頁卡片等 UI 讀取，規則層不使用。
 * 全部選填 —— 未填也能 register，只是卡片少一行文字。
 */
export interface GamePresentation {
  /** 一句話規則摘要（給玩家看，不是架構自述） */
  readonly description?: string;
  /** 盤面尺寸，例如 "9 × 10"、"15 × 15" */
  readonly boardSize?: string;
  /**
   * 英語圈通行的遊戲名（非中文直譯）。
   * 例：Xiangqi（World Xiangqi Federation 官方用字）、
   * Gomoku（無禁手版本；有禁手＋開局限制才叫 Renju）、
   * Banqi（英文維基與 BoardGameGeek 條目名）。
   */
  readonly latinName?: string;
  /** 卡片識別色 token */
  readonly accent?: GameAccent;
}

export interface GameEngine<State, Move, ViewState = State>
  extends GamePresentation {
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