/**
 * 所有棋種合法玩家值的聯集。
 *
 * 理想做法是讓 GameEngine 帶一個 Player 型別參數、各棋種自帶聯集
 * （例如 XiangqiPlayer = "red" | "black"），但 Player 目前貫穿共用 UI
 * 層（StatusBar／MoveHistory／BoardSidePanel／GameModeSelector／
 * useGameSession 等），加型別參數會讓那些每個棋種共用的 hook 與元件
 * 全部多背一個泛型參數，波及面過大、不符合 side project 的可讀性成本。
 * 因此退而求其次：一個涵蓋所有棋種合法值的聯集。仍能擋住 typo
 * （例如 "reed"），只是擋不住「把 white 傳給象棋」這種跨棋種誤用。
 */
export type Player = "red" | "black" | "white";

/** 已註冊棋種的封閉聯集；新增棋種時要在此多加一個字面值。 */
export type GameId = "xiangqi" | "gomoku" | "banqi";

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
  /** 英文版規則摘要 */
  readonly descriptionEn?: string;
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