import type { GameEngine, GameViewContext, MoveRecord, Player } from "./types";

/**
 * 還原一個進行到一半的對局所需的完整資料。
 * 由 SaveManager 在通過所有驗證之後建構並交給 GameSession。
 */
export interface SessionRestorePayload<State, Move> {
  /** 還原後的當前局面（權威狀態）。 */
  readonly state: State;
  /** 本局起始局面，作為復盤（ReplayManager）的起點。 */
  readonly initialState: State;
  /** 完整棋譜。 */
  readonly history: readonly MoveRecord<Move>[];
  /** 每一步「落子之前」的局面，供悔棋使用；長度必須等於 history。 */
  readonly snapshots: readonly State[];
}

export class GameSession<State, Move, ViewState = State> {
  private state: State;
  private initialState: State;
  private readonly history: MoveRecord<Move>[] = [];
  private readonly snapshots: State[] = [];

  constructor(private readonly engine: GameEngine<State, Move, ViewState>) {
    this.state = engine.createInitialState();
    this.initialState = this.state;
  }

  getState(): State {
    return this.state;
  }

  getInitialState(): State {
    return this.initialState;
  }

  /**
   * 以單一局面重置 session：棋譜與悔棋快照一併清空，
   * 該局面同時成為新的復盤起點（clean baseline 語義）。
   */
  loadState(state: State): void {
    this.state = state;
    this.initialState = state;
    this.history.length = 0;
    this.snapshots.length = 0;
  }

  /**
   * 以完整對局資料還原 session（局面 + 棋譜 + 悔棋快照 + 復盤起點）。
   * 與 loadState() 的差別：此方法保留棋譜，因此載入存檔後悔棋與復盤仍可用。
   * payload 由呼叫端（SaveManager）預先驗證完成；此處僅做長度一致性檢查後原子性寫入。
   */
  restoreFrom(payload: SessionRestorePayload<State, Move>): void {
    if (payload.snapshots.length !== payload.history.length) {
      throw new Error(
        `Invalid restore payload: snapshots (${payload.snapshots.length}) must match history (${payload.history.length})`
      );
    }

    this.state = payload.state;
    this.initialState = payload.initialState;
    this.history.length = 0;
    this.history.push(...payload.history);
    this.snapshots.length = 0;
    this.snapshots.push(...payload.snapshots);
  }

  getView(context: GameViewContext): ViewState {
    return this.engine.projectView(this.state, context);
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
    this.initialState = this.state;
    this.history.length = 0;
    this.snapshots.length = 0;
    return this.state;
  }
}